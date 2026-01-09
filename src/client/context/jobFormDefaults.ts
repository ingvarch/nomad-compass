/**
 * Default values for job form data structures.
 */
import { NomadJobFormData, TaskGroupFormData, NomadServiceConfig } from '../types/nomad';

// Default service configuration
export const defaultServiceConfig: NomadServiceConfig = {
  name: '',
  portLabel: 'http',
  provider: 'nomad',
  addressMode: 'alloc',
  tags: [],
  ingress: {
    enabled: false,
    domain: '',
    enableHttps: true,
    pathPrefix: '',
  },
  useAdvancedMode: false,
};

// Default task group configuration
export const defaultTaskGroupData: TaskGroupFormData = {
  name: '',
  count: 1,
  image: '',
  plugin: 'podman',
  resources: {
    CPU: 100,
    MemoryMB: 256,
    DiskMB: 500,
  },
  envVars: [],
  usePrivateRegistry: false,
  dockerAuth: { username: '', password: '' },
  enableNetwork: false,
  networkMode: 'bridge',
  ports: [{ label: 'http', value: 0, to: 80, static: false }],
  enableHealthCheck: false,
  healthCheck: {
    type: 'http',
    path: '/health',
    interval: 30,
    timeout: 5,
    initialDelay: 5,
    failuresBeforeUnhealthy: 3,
    successesBeforeHealthy: 2,
  },
  enableService: false,
  serviceConfig: { ...defaultServiceConfig },
};

export const defaultFormValues: NomadJobFormData = {
  name: '',
  namespace: 'default',
  taskGroups: [{ ...defaultTaskGroupData }],
  serviceProvider: 'nomad',
  datacenters: ['dc1'],
};
