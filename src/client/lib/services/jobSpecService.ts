import type {
  NomadJobFormData,
  TaskGroupFormData,
  NomadPort,
  NomadEnvVar,
  NomadServiceConfig,
  NomadServiceTag,
  NomadServiceCheck,
  NomadServiceDefinition,
  NomadConstraint,
  NomadTaskDriverConfig,
  NomadJob,
  NomadTaskGroup,
} from '../../types/nomad';
import {
  generateTraefikTags,
  serviceTagsToStrings,
  parseTraefikTagsToIngress,
} from './traefikTagsService';

// Re-export clone utilities for external use
export { prepareCloneFormData } from './jobCloneService';

interface NetworkConfig {
  Mode: string;
  DynamicPorts: Array<{ Label: string; To: number }>;
  ReservedPorts: Array<{ Label: string; Value: number; To?: number }>;
}

interface TaskConfig {
  Name: string;
  Driver: string;
  Config: NomadTaskDriverConfig;
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
  Services?: Array<NomadServiceDefinition>;
  Meta?: Record<string, string>;
  Constraints?: NomadConstraint[];
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
    Constraints?: NomadConstraint[];
    Priority?: number;
  };
}

/**
 * Creates service configuration for a task group
 */
function createServiceForTaskGroup(
  groupData: TaskGroupFormData,
  healthCheckConfig: NomadServiceCheck | null
): NomadServiceDefinition | null {
  const needsService = groupData.enableService || groupData.enableHealthCheck;
  if (!needsService) {
    return null;
  }

  const serviceConfig = groupData.serviceConfig;
  const portLabel =
    groupData.ports.length > 0 && groupData.ports[0].label ? groupData.ports[0].label : 'http';

  // Build tags array
  let tags: string[] = [];

  if (groupData.enableService && serviceConfig) {
    if (serviceConfig.useAdvancedMode) {
      tags = serviceTagsToStrings(serviceConfig.tags);
    } else if (serviceConfig.ingress?.enabled) {
      tags = generateTraefikTags(serviceConfig.name || groupData.name, serviceConfig.ingress);
    }
  }

  const service: NomadServiceDefinition = {
    Name: serviceConfig?.name || groupData.name,
    TaskName: groupData.name,
    AddressMode: serviceConfig?.addressMode || 'alloc',
    PortLabel: serviceConfig?.portLabel || portLabel,
    Provider: serviceConfig?.provider || 'nomad',
  };

  if (tags.length > 0) {
    service.Tags = tags;
  }

  if (healthCheckConfig) {
    service.Checks = [healthCheckConfig];
  }

  return service;
}

/**
 * Creates a task configuration object for a Nomad job
 */
function createTaskConfig(groupData: TaskGroupFormData): TaskConfig {
  const env: Record<string, string> = {};

  if (groupData.envVars && groupData.envVars.length > 0) {
    groupData.envVars.forEach((envVar) => {
      if (envVar.key.trim() !== '') {
        env[envVar.key] = envVar.value;
      }
    });
  }

  const taskConfig: NomadTaskDriverConfig = {
    image: groupData.image,
  };

  if (groupData.usePrivateRegistry && groupData.dockerAuth) {
    taskConfig.auth = {
      username: groupData.dockerAuth.username,
      password: groupData.dockerAuth.password,
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
      DiskMB: groupData.resources.DiskMB || 500,
    },
  };
}

/**
 * Creates network configuration from form data
 */
function createNetworkConfig(groupData: TaskGroupFormData): NetworkConfig | undefined {
  if (!groupData.enableNetwork) {
    return undefined;
  }

  const network: NetworkConfig = {
    Mode: groupData.networkMode || 'bridge',
    DynamicPorts: [],
    ReservedPorts: [],
  };

  groupData.ports.forEach((port) => {
    if (port.label.trim() === '') return;

    if (port.static) {
      network.ReservedPorts.push({
        Label: port.label,
        Value: port.value,
        ...(port.to ? { To: port.to } : {}),
      });
    } else {
      network.DynamicPorts.push({
        Label: port.label,
        To: port.to || 0,
      });
    }
  });

  return network;
}

/**
 * Creates health check configuration from form data
 */
function createHealthCheckConfig(groupData: TaskGroupFormData): NomadServiceCheck | null {
  if (!groupData.enableHealthCheck || !groupData.healthCheck) {
    return null;
  }

  const healthCheck = groupData.healthCheck;
  return {
    Type: healthCheck.type,
    ...(healthCheck.type === 'http' ? { Path: healthCheck.path } : {}),
    ...(healthCheck.type === 'script' ? { Command: healthCheck.command } : {}),
    Interval: healthCheck.interval * 1000000000,
    Timeout: healthCheck.timeout * 1000000000,
    CheckRestart: {
      Limit: 3,
      Grace: (healthCheck.initialDelay || 5) * 1000000000,
      IgnoreWarnings: false,
    },
  };
}

/**
 * Creates a Nomad job specification from form data
 */
export function createJobSpec(formData: NomadJobFormData): JobSpec {
  const taskGroups = formData.taskGroups.map((groupData) => {
    const network = createNetworkConfig(groupData);
    const task = createTaskConfig(groupData);
    const healthCheckConfig = createHealthCheckConfig(groupData);

    const taskGroup: TaskGroupConfig = {
      Name: groupData.name,
      Count: groupData.count,
      Tasks: [task],
    };

    if (network && (network.DynamicPorts.length > 0 || network.ReservedPorts.length > 0)) {
      taskGroup.Networks = [network];
    }

    const service = createServiceForTaskGroup(groupData, healthCheckConfig);
    if (service) {
      taskGroup.Services = [service];
    }

    return taskGroup;
  });

  return {
    Job: {
      ID: formData.name,
      Name: formData.name,
      Namespace: formData.namespace,
      Type: 'service',
      Datacenters: formData.datacenters,
      TaskGroups: taskGroups,
    },
  };
}

/**
 * Updates an existing Nomad job specification with form data
 */
export function updateJobSpec(originalJob: NomadJob | null, formData: NomadJobFormData): JobSpec {
  const newJobSpec = createJobSpec(formData);

  if (originalJob) {
    newJobSpec.Job.ID = originalJob.ID;
    newJobSpec.Job.Name = originalJob.Name;

    if (originalJob.Meta) {
      newJobSpec.Job.Meta = originalJob.Meta;
    }

    if (originalJob.Constraints) {
      newJobSpec.Job.Constraints = originalJob.Constraints;
    }

    if (originalJob.Priority !== undefined) {
      newJobSpec.Job.Priority = originalJob.Priority;
    }

    if (originalJob.TaskGroups && originalJob.TaskGroups.length > 0) {
      newJobSpec.Job.TaskGroups.forEach((newTG) => {
        const originalTG = originalJob.TaskGroups!.find(
          (tg: NomadTaskGroup) => tg.Name === newTG.Name
        );
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
 * Extracts ports from network configuration
 */
function extractPortsFromNetwork(networkConfig: NomadTaskGroup['Networks']): NomadPort[] {
  if (!networkConfig || networkConfig.length === 0) {
    return [];
  }

  const network = networkConfig[0];
  const ports: NomadPort[] = [];

  if (network.DynamicPorts) {
    ports.push(
      ...network.DynamicPorts.map((port) => ({
        label: port.Label,
        value: 0,
        to: port.To || 0,
        static: false,
      }))
    );
  }

  if (network.ReservedPorts) {
    ports.push(
      ...network.ReservedPorts.map((port) => ({
        label: port.Label,
        value: port.Value,
        to: port.To || port.Value,
        static: true,
      }))
    );
  }

  return ports;
}

/**
 * Extracts service configuration from task group
 */
function extractServiceConfig(
  group: NomadTaskGroup
): { serviceConfig: NomadServiceConfig; enableService: boolean; healthCheck: NomadEnvVar | null } {
  const services = group.Services || [];
  const service = services.length > 0 ? services[0] : null;
  const healthCheck =
    service && service.Checks && service.Checks.length > 0 ? service.Checks[0] : null;

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

  const hasTraefikTags = serviceTags.some((t) => t.key.startsWith('traefik.'));
  const ingressConfig = parseTraefikTagsToIngress(serviceTags);
  const canUseSimpleMode = hasTraefikTags && ingressConfig.enabled;

  const serviceConfig: NomadServiceConfig = {
    name: service?.Name || group.Name,
    portLabel: service?.PortLabel || 'http',
    provider: (service?.Provider || 'nomad') as 'nomad' | 'consul',
    addressMode: (service?.AddressMode || 'alloc') as 'alloc' | 'auto' | 'host',
    tags: serviceTags,
    ingress: ingressConfig,
    useAdvancedMode: hasTraefikTags && !canUseSimpleMode,
  };

  const enableService = !!service && (serviceTags.length > 0 || !healthCheck);

  return { serviceConfig, enableService, healthCheck: healthCheck as NomadEnvVar | null };
}

/**
 * Converts a job from the API to our form data structure
 */
export function convertJobToFormData(job: NomadJob): NomadJobFormData {
  const taskGroups = (job.TaskGroups || []).map((group: NomadTaskGroup) => {
    const task = group.Tasks[0];
    const config = task.Config || {};

    const envVars: NomadEnvVar[] = task.Env
      ? Object.entries(task.Env)
          .map(([key, value]) => ({ key, value: value as string }))
          .sort((a, b) => a.key.localeCompare(b.key))
      : [];

    const usePrivateRegistry = !!(config.auth && config.auth.username && config.auth.password);

    const networkConfig = group.Networks && group.Networks.length > 0 ? group.Networks[0] : null;
    const enableNetwork = !!networkConfig;
    const networkMode = networkConfig && networkConfig.Mode ? networkConfig.Mode : 'none';

    let ports = extractPortsFromNetwork(group.Networks);
    if (ports.length === 0 && enableNetwork) {
      ports = [{ label: 'http', value: 8080, to: 8080, static: false }];
    }

    const { serviceConfig, enableService, healthCheck } = extractServiceConfig(group);

    const healthCheckData = healthCheck
      ? {
          type: ((healthCheck as unknown as NomadServiceCheck).Type || 'http') as
            | 'http'
            | 'tcp'
            | 'script',
          path:
            (healthCheck as unknown as NomadServiceCheck).Type === 'http'
              ? (healthCheck as unknown as NomadServiceCheck).Path
              : '/health',
          command:
            (healthCheck as unknown as NomadServiceCheck).Type === 'script'
              ? (healthCheck as unknown as NomadServiceCheck).Command
              : '',
          interval: Math.floor(
            (healthCheck as unknown as NomadServiceCheck).Interval / 1000000000
          ),
          timeout: Math.floor((healthCheck as unknown as NomadServiceCheck).Timeout / 1000000000),
          initialDelay: (healthCheck as unknown as NomadServiceCheck).CheckRestart
            ? Math.floor(
                (healthCheck as unknown as NomadServiceCheck).CheckRestart!.Grace / 1000000000
              )
            : 5,
          failuresBeforeUnhealthy: 3,
          successesBeforeHealthy: 2,
        }
      : undefined;

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
      envVars,
      usePrivateRegistry,
      dockerAuth:
        usePrivateRegistry && config.auth
          ? {
              username: config.auth.username,
              password: config.auth.password,
            }
          : undefined,
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
