// src/lib/services/jobSpecService.ts
import { NomadJobFormData, TaskGroupFormData, NomadPort, NomadHealthCheck, NomadEnvVar } from '@/types/nomad';

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

        // Add health check service if enabled
        if (groupData.enableHealthCheck && groupData.healthCheck) {
            const healthCheck = groupData.healthCheck;

            const service = {
                Name: groupData.name,
                TaskName: groupData.name,
                AddressMode: "auto",
                PortLabel: groupData.ports.length > 0 && groupData.ports[0].label ?
                    groupData.ports[0].label : "http",
                Provider: "nomad",
                Checks: [{
                    Type: healthCheck.type,
                    ...(healthCheck.type === 'http' ? {Path: healthCheck.path} : {}),
                    ...(healthCheck.type === 'script' ? {Command: healthCheck.command} : {}),
                    Interval: healthCheck.interval * 1000000000, // Convert to nanoseconds
                    Timeout: healthCheck.timeout * 1000000000, // Convert to nanoseconds
                    CheckRestart: {
                        Limit: 3,
                        Grace: (healthCheck.initialDelay || 5) * 1000000000,
                        IgnoreWarnings: false
                    }
                }]
            };

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

        // Extract health checks
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
            healthCheck: healthCheckData
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

export { createJobSpec, updateJobSpec, convertJobToFormData };
