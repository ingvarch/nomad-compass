// src/lib/services/jobSpecService.ts
import {
    NomadJobFormData,
    TaskGroupFormData,
    NomadPort,
    NomadHealthCheck,
    NomadEnvVar,
    NomadServiceConfig,
    NomadServiceTag,
    IngressConfig
} from '../../types/nomad';

/**
 * Generates Traefik service tags from ingress configuration (Simple Mode)
 */
function generateTraefikTags(serviceName: string, ingress: IngressConfig): string[] {
    if (!ingress.enabled || !ingress.domain) {
        return [];
    }

    // Sanitize service name for use as router name
    const routerName = serviceName.replace(/[^a-zA-Z0-9]/g, '-');
    const tags: string[] = ['traefik.enable=true'];

    // Build the routing rule
    let routeRule = `Host(\`${ingress.domain}\`)`;
    if (ingress.pathPrefix) {
        routeRule = `Host(\`${ingress.domain}\`) && PathPrefix(\`${ingress.pathPrefix}\`)`;
    }
    tags.push(`traefik.http.routers.${routerName}.rule=${routeRule}`);

    // Configure entrypoints and TLS
    if (ingress.enableHttps) {
        tags.push(`traefik.http.routers.${routerName}.entrypoints=websecure`);
        tags.push(`traefik.http.routers.${routerName}.tls.certresolver=letsencrypt`);
    } else {
        tags.push(`traefik.http.routers.${routerName}.entrypoints=web`);
    }

    return tags;
}

/**
 * Converts raw service tags array to string array for Nomad
 */
function serviceTagsToStrings(tags: NomadServiceTag[]): string[] {
    return tags
        .filter(t => t.key.trim() !== '')
        .map(t => t.value ? `${t.key}=${t.value}` : t.key);
}

/**
 * Parses Traefik tags back to IngressConfig (for edit mode)
 */
function parseTraefikTagsToIngress(tags: NomadServiceTag[]): IngressConfig {
    const defaultConfig: IngressConfig = {
        enabled: false,
        domain: '',
        enableHttps: true,
        pathPrefix: '',
    };

    // Check if traefik is enabled
    const enableTag = tags.find(t => t.key === 'traefik.enable');
    if (!enableTag || enableTag.value !== 'true') {
        return defaultConfig;
    }

    // Find the router rule to extract domain
    const ruleTag = tags.find(t => t.key.match(/traefik\.http\.routers\.[^.]+\.rule/));
    if (!ruleTag) {
        return defaultConfig;
    }

    // Parse domain from rule: Host(`domain.com`) or Host(`domain.com`) && PathPrefix(`/api`)
    const hostMatch = ruleTag.value.match(/Host\(`([^`]+)`\)/);
    const domain = hostMatch ? hostMatch[1] : '';

    // Parse path prefix if present
    const pathMatch = ruleTag.value.match(/PathPrefix\(`([^`]+)`\)/);
    const pathPrefix = pathMatch ? pathMatch[1] : '';

    // Check for HTTPS (certresolver or tls)
    const httpsTag = tags.find(t =>
        t.key.match(/traefik\.http\.routers\.[^.]+\.tls\.certresolver/) ||
        t.key.match(/traefik\.http\.routers\.[^.]+\.tls$/)
    );
    const enableHttps = !!httpsTag;

    return {
        enabled: !!domain,
        domain,
        enableHttps,
        pathPrefix,
    };
}

/**
 * Creates service configuration for a task group
 */
function createServiceForTaskGroup(
    groupData: TaskGroupFormData,
    healthCheckConfig: any | null
): any | null {
    // Determine if we need a service
    const needsService = groupData.enableService || groupData.enableHealthCheck;
    if (!needsService) {
        return null;
    }

    const serviceConfig = groupData.serviceConfig;
    const portLabel = groupData.ports.length > 0 && groupData.ports[0].label
        ? groupData.ports[0].label
        : 'http';

    // Build tags array
    let tags: string[] = [];

    if (groupData.enableService && serviceConfig) {
        if (serviceConfig.useAdvancedMode) {
            // Advanced mode: use raw tags
            tags = serviceTagsToStrings(serviceConfig.tags);
        } else if (serviceConfig.ingress?.enabled) {
            // Simple mode: generate Traefik tags
            tags = generateTraefikTags(
                serviceConfig.name || groupData.name,
                serviceConfig.ingress
            );
        }
    }

    const service: any = {
        Name: serviceConfig?.name || groupData.name,
        TaskName: groupData.name,
        AddressMode: serviceConfig?.addressMode || 'alloc',
        PortLabel: serviceConfig?.portLabel || portLabel,
        Provider: serviceConfig?.provider || 'nomad',
    };

    // Only add Tags if there are any
    if (tags.length > 0) {
        service.Tags = tags;
    }

    // Add health checks if enabled
    if (healthCheckConfig) {
        service.Checks = [healthCheckConfig];
    }

    return service;
}

interface NetworkConfig {
    Mode: string;
    DynamicPorts: Array<{Label: string, To: number}>;
    ReservedPorts: Array<{Label: string, Value: number, To?: number}>;
}

interface TaskConfig {
    Name: string;
    Driver: string;
    Config: any;
    Env: Record<string, string>;
    Resources: {
        CPU: number;
        MemoryMB: number;
        DiskMB: number;
    };
}

interface TaskGroupConfig {
    Name: string;
    Count: number;
    Tasks: Array<TaskConfig>;
    Networks?: Array<NetworkConfig>;
    Services?: Array<any>;
    Meta?: Record<string, string>;
    Constraints?: any[];
}

interface JobSpec {
    Job: {
        ID: string;
        Name: string;
        Namespace: string;
        Type: string;
        Datacenters: string[];
        TaskGroups: TaskGroupConfig[];
        Meta?: Record<string, string>;
        Constraints?: any[];
        Priority?: number;
    };
}

/**
 * Creates a task configuration object for a Nomad job
 */
function createTaskConfig(groupData: TaskGroupFormData): TaskConfig {
    // Convert environment variables to the format expected by Nomad
    const env: Record<string, string> = {};

    // Only process env vars that actually exist and have a key
    if (groupData.envVars && groupData.envVars.length > 0) {
        groupData.envVars.forEach((envVar) => {
            if (envVar.key.trim() !== '') {
                env[envVar.key] = envVar.value;
            }
        });
    }

    // Base task configuration
    const taskConfig: any = {
        image: groupData.image,
    };

    // DockerAuth for private registry
    // SECURITY NOTE: These credentials are stored in the job spec and visible in Nomad.
    // For production environments, consider:
    // 1. Nomad Vault integration for dynamic secret injection
    // 2. Node-level registry authentication (docker login on Nomad clients)
    // 3. Credential helper configured on Nomad clients
    if (groupData.usePrivateRegistry && groupData.dockerAuth) {
        taskConfig.auth = {
            username: groupData.dockerAuth.username,
            password: groupData.dockerAuth.password
        };
    }

    return {
        Name: groupData.name,
        Driver: groupData.plugin,
        Config: taskConfig,
        Env: env,
        Resources: {
            CPU: groupData.resources.CPU,
            MemoryMB: groupData.resources.MemoryMB,
            DiskMB: groupData.resources.DiskMB || 500
        }
    };
}

/**
 * Creates a Nomad job specification from form data
 */
function createJobSpec(formData: NomadJobFormData): JobSpec {
    // Create task groups (one task per group)
    const taskGroups = formData.taskGroups.map(groupData => {
        // Prepare network configuration based on user selection
        let network: NetworkConfig | undefined;

        if (!groupData.enableNetwork) {
            network = undefined;
        } else {
            network = {
                Mode: groupData.networkMode || 'bridge', // Default to bridge if not specified
                DynamicPorts: [] as Array<{Label: string, To: number}>,
                ReservedPorts: [] as Array<{Label: string, Value: number, To?: number}>
            };

            // Process ports configuration
            // Only use ports with a label
            groupData.ports.forEach(port => {
                if (port.label.trim() === '') return;

                const portConfig: any = {
                    Label: port.label,
                    ...(port.to ? {To: port.to} : {})
                };

                if (port.static) {
                    // For static ports, include the host port value
                    portConfig.Value = port.value;
                    network!.ReservedPorts.push(portConfig);
                } else {
                    // For dynamic ports, don't include a specific value
                    network!.DynamicPorts.push(portConfig);
                }
            });
        }

        // Create task configuration for this group (one task per group)
        const task = createTaskConfig(groupData);

        // Task group configuration
        const taskGroup: TaskGroupConfig = {
            Name: groupData.name,
            Count: groupData.count,
            Tasks: [task]
        };

        if (network) {
            // Only add network config if there are ports defined
            if (network.DynamicPorts.length > 0 || network.ReservedPorts.length > 0) {
                taskGroup.Networks = [network];
            }
        }

        // Build health check config if enabled
        let healthCheckConfig: any | null = null;
        if (groupData.enableHealthCheck && groupData.healthCheck) {
            const healthCheck = groupData.healthCheck;
            healthCheckConfig = {
                Type: healthCheck.type,
                ...(healthCheck.type === 'http' ? { Path: healthCheck.path } : {}),
                ...(healthCheck.type === 'script' ? { Command: healthCheck.command } : {}),
                Interval: healthCheck.interval * 1000000000, // Convert to nanoseconds
                Timeout: healthCheck.timeout * 1000000000, // Convert to nanoseconds
                CheckRestart: {
                    Limit: 3,
                    Grace: (healthCheck.initialDelay || 5) * 1000000000,
                    IgnoreWarnings: false
                }
            };
        }

        // Create service (includes both service discovery tags and health checks)
        const service = createServiceForTaskGroup(groupData, healthCheckConfig);
        if (service) {
            taskGroup.Services = [service];
        }

        return taskGroup;
    });

    // Basic job template for Nomad
    return {
        Job: {
            ID: formData.name,
            Name: formData.name,
            Namespace: formData.namespace,
            Type: 'service',
            Datacenters: formData.datacenters,
            TaskGroups: taskGroups
        }
    };
}

/**
 * Updates an existing Nomad job specification with form data
 * This preserves important job metadata
 */
function updateJobSpec(originalJob: any, formData: NomadJobFormData): JobSpec {
    // Create a new job spec from the form data
    const newJobSpec = createJobSpec(formData);

    // Ensure we preserve the original Job ID, Name, and critical metadata
    if (originalJob) {
        // Copy important fields that shouldn't be changed
        newJobSpec.Job.ID = originalJob.ID;
        newJobSpec.Job.Name = originalJob.Name;

        // Preserve job metadata if available
        if (originalJob.Meta) {
            newJobSpec.Job.Meta = originalJob.Meta;
        }

        // Preserve any job constraints
        if (originalJob.Constraints) {
            newJobSpec.Job.Constraints = originalJob.Constraints;
        }

        // Preserve job priorities
        if (originalJob.Priority !== undefined) {
            newJobSpec.Job.Priority = originalJob.Priority;
        }

        // Attempt to preserve metadata for task groups that still exist with the same name
        if (originalJob.TaskGroups && originalJob.TaskGroups.length > 0) {
            newJobSpec.Job.TaskGroups.forEach(newTG => {
                const originalTG = originalJob.TaskGroups.find((tg: any) => tg.Name === newTG.Name);
                if (originalTG) {
                    if (originalTG.Meta) {
                        newTG.Meta = originalTG.Meta;
                    }
                    if (originalTG.Constraints) {
                        newTG.Constraints = originalTG.Constraints;
                    }
                }
            });
        }
    }

    return newJobSpec;
}

/**
 * Converts a job from the API to our form data structure
 */
function convertJobToFormData(job: any): NomadJobFormData {
    // Extract task groups
    const taskGroups = job.TaskGroups.map((group: any) => {
        // In our new model, each group has exactly one task
        const task = group.Tasks[0];
        const config = task.Config || {};

        // Extract environment variables (sorted alphabetically by key)
        const envVars: NomadEnvVar[] = task.Env ?
            Object.entries(task.Env)
                .map(([key, value]) => ({ key, value: value as string }))
                .sort((a, b) => a.key.localeCompare(b.key)) :
            [];

        // Extract Docker auth if present
        const usePrivateRegistry = !!(config.auth && config.auth.username && config.auth.password);

        // Extract network configuration
        const networkConfig = group.Networks && group.Networks.length > 0 ? group.Networks[0] : null;
        const enableNetwork = !!networkConfig;
        const networkMode = (networkConfig && networkConfig.Mode) ? networkConfig.Mode : 'none';

        // Extract ports
        let ports: NomadPort[] = [];

        if (networkConfig) {
            // Add dynamic ports
            if (networkConfig.DynamicPorts && networkConfig.DynamicPorts.length > 0) {
                ports = [
                    ...ports,
                    ...networkConfig.DynamicPorts.map((port: any) => ({
                        label: port.Label,
                        value: 0, // Dynamic ports don't have a specific value
                        to: port.To || 0,
                        static: false
                    }))
                ];
            }

            // Add reserved ports
            if (networkConfig.ReservedPorts && networkConfig.ReservedPorts.length > 0) {
                ports = [
                    ...ports,
                    ...networkConfig.ReservedPorts.map((port: any) => ({
                        label: port.Label,
                        value: port.Value,
                        to: port.To || port.Value,
                        static: true
                    }))
                ];
            }
        }

        // If no ports found, add a default one
        if (ports.length === 0 && enableNetwork) {
            ports = [{ label: 'http', value: 8080, to: 8080, static: false }];
        }

        // Extract service configuration
        const services = group.Services || [];
        const service = services.length > 0 ? services[0] : null;
        const healthCheck = service && service.Checks && service.Checks.length > 0 ? service.Checks[0] : null;

        const healthCheckData = healthCheck ? {
            type: (healthCheck.Type || 'http') as 'http' | 'tcp' | 'script',
            path: healthCheck.Type === 'http' ? healthCheck.Path : '/health',
            command: healthCheck.Type === 'script' ? healthCheck.Command : '',
            interval: healthCheck ? Math.floor(healthCheck.Interval / 1000000000) : 30, // Convert from nanoseconds
            timeout: healthCheck ? Math.floor(healthCheck.Timeout / 1000000000) : 5, // Convert from nanoseconds
            initialDelay: healthCheck.CheckRestart ? Math.floor(healthCheck.CheckRestart.Grace / 1000000000) : 5,
            failuresBeforeUnhealthy: 3,
            successesBeforeHealthy: 2
        } : undefined;

        // Parse service tags
        const serviceTags: NomadServiceTag[] = (service?.Tags || []).map((tag: string) => {
            const eqIndex = tag.indexOf('=');
            if (eqIndex > 0) {
                return {
                    key: tag.substring(0, eqIndex),
                    value: tag.substring(eqIndex + 1),
                };
            }
            return { key: tag, value: '' };
        });

        // Detect if this is a Traefik ingress configuration (simple mode)
        const hasTraefikTags = serviceTags.some(t => t.key.startsWith('traefik.'));
        const ingressConfig = parseTraefikTagsToIngress(serviceTags);
        const canUseSimpleMode = hasTraefikTags && ingressConfig.enabled;

        // Build service config
        const serviceConfig: NomadServiceConfig = {
            name: service?.Name || group.Name,
            portLabel: service?.PortLabel || 'http',
            provider: (service?.Provider || 'nomad') as 'nomad' | 'consul',
            addressMode: (service?.AddressMode || 'alloc') as 'alloc' | 'auto' | 'host',
            tags: serviceTags,
            ingress: ingressConfig,
            useAdvancedMode: hasTraefikTags && !canUseSimpleMode,
        };

        // Determine if service discovery is enabled (has service with tags)
        const enableService = !!service && (serviceTags.length > 0 || !healthCheck);

        return {
            name: group.Name,
            count: group.Count || 1,
            image: config.image || '',
            plugin: task.Driver || 'podman',
            resources: {
                CPU: task.Resources?.CPU || 100,
                MemoryMB: task.Resources?.MemoryMB || 256,
                DiskMB: task.Resources?.DiskMB || 500,
            },
            envVars: envVars,
            usePrivateRegistry,
            dockerAuth: usePrivateRegistry ? {
                username: config.auth.username,
                password: config.auth.password
            } : undefined,
            enableNetwork,
            networkMode: networkMode as 'none' | 'host' | 'bridge',
            ports,
            enableHealthCheck: !!healthCheck,
            healthCheck: healthCheckData,
            enableService,
            serviceConfig,
        };
    });

    return {
        name: job.Name,
        namespace: job.Namespace || 'default',
        taskGroups,
        serviceProvider: 'nomad',
        datacenters: job.Datacenters || ['dc1'],
    };
}

/**
 * Generates a clone name from the original job name
 * Examples: "myapp" → "myapp-copy-1", "myapp-copy-1" → "myapp-copy-2"
 */
function generateCloneName(originalName: string): string {
    // Check if the name already ends with -copy-N pattern
    const copyPattern = /^(.+)-copy-(\d+)$/;
    const match = originalName.match(copyPattern);

    if (match) {
        // Increment the existing copy number
        const baseName = match[1];
        const currentNumber = parseInt(match[2], 10);
        return `${baseName}-copy-${currentNumber + 1}`;
    }

    // New clone - add -copy-1 suffix
    return `${originalName}-copy-1`;
}

/**
 * Modifies an ingress domain for a cloned job to avoid conflicts
 * Examples:
 *   "myapp.example.com" → "myapp-copy-1.example.com"
 *   "api.prod.example.com" → "api-copy-1.prod.example.com"
 */
function modifyIngressDomainForClone(domain: string, cloneSuffix: string): string {
    if (!domain) return domain;

    // Extract the copy number from the suffix (e.g., "myapp-copy-1" → "copy-1")
    const suffixMatch = cloneSuffix.match(/-copy-(\d+)$/);
    const copySuffix = suffixMatch ? `-copy-${suffixMatch[1]}` : '-copy-1';

    // Split domain into parts
    const parts = domain.split('.');

    if (parts.length < 2) {
        // Simple domain without dots - just append suffix
        return `${domain}${copySuffix}`;
    }

    // Modify only the first subdomain segment
    parts[0] = `${parts[0]}${copySuffix}`;
    return parts.join('.');
}

/**
 * Generates a clone suffix from the clone name
 * Examples: "myapp-copy-1" → "-copy-1"
 */
function getCloneSuffix(cloneName: string): string {
    const match = cloneName.match(/(-copy-\d+)$/);
    return match ? match[1] : '-copy-1';
}

/**
 * Prepares form data for cloning a job
 * Modifies job name, task group names, service names, and ingress domain to avoid conflicts
 */
function prepareCloneFormData(formData: NomadJobFormData): NomadJobFormData {
    const cloneName = generateCloneName(formData.name);
    const cloneSuffix = getCloneSuffix(cloneName);

    return {
        ...formData,
        name: cloneName,
        taskGroups: formData.taskGroups.map(group => {
            // Generate new task group name
            const newGroupName = `${group.name}${cloneSuffix}`;

            // Generate new service name
            const newServiceName = group.serviceConfig?.name
                ? `${group.serviceConfig.name}${cloneSuffix}`
                : newGroupName;

            // Build updated service config
            let updatedServiceConfig = group.serviceConfig;
            if (updatedServiceConfig) {
                updatedServiceConfig = {
                    ...updatedServiceConfig,
                    name: newServiceName,
                };

                // If ingress is enabled, modify the domain
                if (updatedServiceConfig.ingress?.enabled && updatedServiceConfig.ingress?.domain) {
                    updatedServiceConfig = {
                        ...updatedServiceConfig,
                        ingress: {
                            ...updatedServiceConfig.ingress,
                            domain: modifyIngressDomainForClone(
                                updatedServiceConfig.ingress.domain,
                                cloneName
                            ),
                        },
                    };
                }
            }

            return {
                ...group,
                name: newGroupName,
                serviceConfig: updatedServiceConfig,
            };
        }),
    };
}

export { createJobSpec, updateJobSpec, convertJobToFormData, generateCloneName, modifyIngressDomainForClone, prepareCloneFormData };
