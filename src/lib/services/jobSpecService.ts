// src/lib/services/jobSpecService.ts
import { NomadJobFormData, TaskFormData } from '@/types/nomad';

interface NetworkConfig {
    Mode: string;
    DynamicPorts: Array<{Label: string, To: number, TaskName?: string}>;
    ReservedPorts: Array<{Label: string, Value: number, To?: number, TaskName?: string}>;
}

interface TaskGroupConfig {
    Name: string;
    Count: number;
    Tasks: Array<any>;
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
function createTaskConfig(taskData: TaskFormData) {
    // Convert environment variables to the format expected by Nomad
    const env: Record<string, string> = {};
    taskData.envVars.forEach((envVar) => {
        if (envVar.key.trim() !== '') {
            env[envVar.key] = envVar.value;
        }
    });

    // Base task configuration
    const taskConfig: any = {
        image: taskData.image,
    };

    // DockerAuth for private registry
    if (taskData.usePrivateRegistry && taskData.dockerAuth) {
        taskConfig.auth = {
            username: taskData.dockerAuth.username,
            password: taskData.dockerAuth.password
        };
    }

    return {
        Name: taskData.name,
        Driver: taskData.plugin,
        Config: taskConfig,
        Env: env,
        Resources: {
            CPU: taskData.resources.CPU,
            MemoryMB: taskData.resources.MemoryMB,
            DiskMB: taskData.resources.DiskMB
        }
    };
}

/**
 * Creates a Nomad job specification from form data
 */
function createJobSpec(formData: NomadJobFormData): JobSpec {
    // Prepare network configuration based on user selection
    let network: NetworkConfig | undefined;

    if (!formData.enablePorts) {
        network = undefined;
    } else {
        network = {
            Mode: formData.networkMode,
            DynamicPorts: [] as Array<{Label: string, To: number, TaskName?: string}>,
            ReservedPorts: [] as Array<{Label: string, Value: number, To?: number, TaskName?: string}>
        };

        // Process ports configuration
        formData.ports.forEach(port => {
            if (port.label.trim() === '') return;

            // Создаём объект порта для Nomad
            const portConfig: any = {
                Label: port.label,
                ...(port.to ? {To: port.to} : {})
            };

            // Если указано имя контейнера и оно существует в списке контейнеров
            if (port.taskName && formData.tasks.some(task => task.name === port.taskName)) {
                portConfig.TaskName = port.taskName;
            }

            if (port.static) {
                portConfig.Value = port.value;
                network!.ReservedPorts.push(portConfig);
            } else {
                network!.DynamicPorts.push(portConfig);
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

    // Create task configurations for each task
    const tasks = formData.tasks.map(taskData => {
        // Ensure task name is set
        if (!taskData.name.trim()) {
            taskData.name = `${formData.name}-task-${formData.tasks.indexOf(taskData) + 1}`;
        }

        return createTaskConfig(taskData);
    });

    const taskGroup: TaskGroupConfig = {
        Name: formData.name,
        Count: formData.count,
        Tasks: tasks
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

        // Preserve task group metadata if necessary
        if (originalJob.TaskGroups && originalJob.TaskGroups.length > 0 &&
            newJobSpec.Job.TaskGroups && newJobSpec.Job.TaskGroups.length > 0) {

            // Preserve original task group properties
            const originalTG = originalJob.TaskGroups[0];
            const newTG = newJobSpec.Job.TaskGroups[0];

            if (originalTG.Meta) {
                newTG.Meta = originalTG.Meta;
            }

            if (originalTG.Constraints) {
                newTG.Constraints = originalTG.Constraints;
            }
        }
    }

    return newJobSpec;
}

export { createJobSpec, updateJobSpec };
