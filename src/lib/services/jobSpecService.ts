// src/lib/services/jobSpecService.ts
import { NomadJobFormData } from '@/types/nomad';

interface NetworkConfig {
    Mode: string;
    DynamicPorts: Array<{Label: string, To: number}>;
    ReservedPorts: Array<{Label: string, Value: number, To?: number}>;
}

interface TaskGroupConfig {
    Name: string;
    Count: number;
    Tasks: Array<any>;
    Networks?: Array<NetworkConfig>;
    Services?: Array<any>;
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
 * Creates a Nomad job specification from form data
 */
export function createJobSpec(formData: NomadJobFormData): JobSpec {
    // Convert environment variables to the format expected by Nomad
    const env: Record<string, string> = {};
    formData.envVars.forEach((envVar) => {
        if (envVar.key.trim() !== '') {
            env[envVar.key] = envVar.value;
        }
    });

    // Prepare network configuration based on user selection
    let network: NetworkConfig | undefined;

    if (!formData.enablePorts) {
        network = undefined;
    } else {
        network = {
            Mode: formData.networkMode,
            DynamicPorts: [] as Array<{Label: string, To: number}>,
            ReservedPorts: [] as Array<{Label: string, Value: number, To?: number}>
        };

        // Process ports configuration
        formData.ports.forEach(port => {
            if (port.label.trim() === '') return;

            if (port.static) {
                network!.ReservedPorts.push({
                    Label: port.label,
                    Value: port.value,
                    ...(port.to && port.to !== port.value ? {To: port.to} : {})
                });
            } else {
                network!.DynamicPorts.push({
                    Label: port.label,
                    To: port.to || port.value
                });
            }
        });
    }

    // Prepare services with health checks if enabled
    const services = formData.enableHealthCheck ? formData.healthChecks.map(check => {
        const healthCheck = {
            Name: `${formData.name}-health`,
            PortLabel: (formData.enablePorts && formData.ports.length > 0) ? formData.ports[0].label : 'http',
            Checks: [{
                Type: check.type,
                ...(check.type === 'http' ? {Path: check.path} : {}),
                ...(check.type === 'script' ? {Command: check.command} : {}),
                Interval: check.interval * 1000000000, // Convert to nanoseconds
                Timeout: check.timeout * 1000000000, // Convert to nanoseconds
                CheckRestart: {
                    Limit: 3,
                    Grace: (check.initialDelay || 5) * 1000000000,
                    IgnoreWarnings: false
                }
            }]
        };
        return healthCheck;
    }) : [];

    // Base task configuration
    const taskConfig: any = {
        image: formData.image,
    };

    // Add ports to taskConfig only if enabled
    if (formData.enablePorts && formData.networkMode !== 'none') {
        taskConfig.ports = formData.ports.map(p => p.label).filter(label => label.trim() !== '');
    }

    // DockerAuth for private registry
    if (formData.usePrivateRegistry && formData.dockerAuth) {
        taskConfig.auth = {
            username: formData.dockerAuth.username,
            password: formData.dockerAuth.password
        };
    }

    const taskGroup: TaskGroupConfig = {
        Name: formData.name,
        Count: formData.count,
        Tasks: [
            {
                Name: formData.name,
                Driver: formData.plugin,
                Config: taskConfig,
                Env: env,
                Resources: {
                    CPU: formData.resources.CPU,
                    MemoryMB: formData.resources.MemoryMB,
                    DiskMB: formData.resources.DiskMB
                }
            }
        ]
    };

    if (network) {
        taskGroup.Networks = [network];
    }

    if (services.length > 0) {
        taskGroup.Services = services;
    }

    // Basic job template for Nomad
    return {
        Job: {
            ID: formData.name,
            Name: formData.name,
            Namespace: formData.namespace,
            Type: 'service',
            Datacenters: formData.datacenters,
            TaskGroups: [taskGroup]
        }
    };
}

/**
 * Updates an existing Nomad job specification with form data
 * This preserves important job metadata
 */
export function updateJobSpec(originalJob: any, formData: NomadJobFormData): JobSpec {
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

        // Preserve task group metadata if necessary
        if (originalJob.TaskGroups && originalJob.TaskGroups.length > 0 &&
            newJobSpec.Job.TaskGroups && newJobSpec.Job.TaskGroups.length > 0) {

            // For each task group in the new spec
            newJobSpec.Job.TaskGroups.forEach((tg: any, index: number) => {
                // Find matching original task group by name
                const originalTG = originalJob.TaskGroups.find((otg: any) => otg.Name === tg.Name);

                if (originalTG) {
                    // Preserve task group metadata
                    if (originalTG.Meta) {
                        tg.Meta = originalTG.Meta;
                    }

                    // Preserve task group constraints
                    if (originalTG.Constraints) {
                        tg.Constraints = originalTG.Constraints;
                    }

                    // Preserve task metadata where possible
                    if (originalTG.Tasks && originalTG.Tasks.length > 0 &&
                        tg.Tasks && tg.Tasks.length > 0) {

                        tg.Tasks.forEach((task: any, taskIndex: number) => {
                            const originalTask = originalTG.Tasks.find((ot: any) => ot.Name === task.Name);

                            if (originalTask) {
                                // Preserve task metadata
                                if (originalTask.Meta) {
                                    task.Meta = originalTask.Meta;
                                }

                                // Preserve task constraints
                                if (originalTask.Constraints) {
                                    task.Constraints = originalTask.Constraints;
                                }

                                // Preserve templates if any
                                if (originalTask.Templates) {
                                    task.Templates = originalTask.Templates;
                                }

                                // Preserve other task configurations that might be important
                                if (originalTask.Leader) {
                                    task.Leader = originalTask.Leader;
                                }

                                if (originalTask.KillTimeout) {
                                    task.KillTimeout = originalTask.KillTimeout;
                                }

                                if (originalTask.ShutdownDelay) {
                                    task.ShutdownDelay = originalTask.ShutdownDelay;
                                }
                            }
                        });
                    }
                }
            });
        }
    }

    return newJobSpec;
}
