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

/**
 * Creates a Nomad job specification from form data
 */
export function createJobSpec(formData: NomadJobFormData) {
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
