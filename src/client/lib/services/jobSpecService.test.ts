import { describe, test, expect } from 'bun:test';
import { createJobSpec, updateJobSpec, convertJobToFormData, prepareCloneFormData } from './jobSpecService';
import type { NomadJobFormData, NomadJob, TaskFormData } from '../../types/nomad';

const defaultTask: TaskFormData = {
    name: 'test-group',
    image: 'nginx:latest',
    plugin: 'docker',
    resources: { CPU: 100, MemoryMB: 256, DiskMB: 500 },
    envVars: [],
    usePrivateRegistry: false,
};

// Helper to create minimal valid form data
function createMinimalFormData(overrides: Partial<NomadJobFormData> = {}): NomadJobFormData {
    return {
        name: 'test-job',
        namespace: 'default',
        serviceProvider: 'nomad',
        datacenters: ['dc1'],
        taskGroups: [{
            name: 'test-group',
            count: 1,
            tasks: [{ ...defaultTask }],
            enableNetwork: false,
            networkMode: 'none',
            ports: [],
            enableHealthCheck: false,
            enableService: false,
        }],
        ...overrides,
    };
}

describe('createJobSpec', () => {
    test('creates minimal job spec', () => {
        const formData = createMinimalFormData();
        const result = createJobSpec(formData);

        expect(result.Job.ID).toBe('test-job');
        expect(result.Job.Name).toBe('test-job');
        expect(result.Job.Namespace).toBe('default');
        expect(result.Job.Type).toBe('service');
        expect(result.Job.Datacenters).toEqual(['dc1']);
        expect(result.Job.TaskGroups).toHaveLength(1);
    });

    test('creates task group with correct structure', () => {
        const formData = createMinimalFormData();
        const result = createJobSpec(formData);
        const taskGroup = result.Job.TaskGroups[0];

        expect(taskGroup.Name).toBe('test-group');
        expect(taskGroup.Count).toBe(1);
        expect(taskGroup.Tasks).toHaveLength(1);
        expect(taskGroup.Tasks[0].Name).toBe('test-group');
        expect(taskGroup.Tasks[0].Driver).toBe('docker');
    });

    test('sets correct task resources', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                tasks: [{ ...defaultTask, resources: { CPU: 500, MemoryMB: 1024, DiskMB: 2000 } }],
            }],
        });
        const result = createJobSpec(formData);
        const task = result.Job.TaskGroups[0].Tasks[0];

        expect(task.Resources.CPU).toBe(500);
        expect(task.Resources.MemoryMB).toBe(1024);
        expect(task.Resources.DiskMB).toBe(2000);
    });

    test('includes docker image in config', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                tasks: [{ ...defaultTask, image: 'myapp:v1.2.3' }],
            }],
        });
        const result = createJobSpec(formData);
        const task = result.Job.TaskGroups[0].Tasks[0];

        expect(task.Config.image).toBe('myapp:v1.2.3');
    });

    test('includes environment variables', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                tasks: [{
                    ...defaultTask,
                    envVars: [
                        { key: 'NODE_ENV', value: 'production' },
                        { key: 'PORT', value: '3000' },
                    ],
                }],
            }],
        });
        const result = createJobSpec(formData);
        const task = result.Job.TaskGroups[0].Tasks[0];

        expect(task.Env['NODE_ENV']).toBe('production');
        expect(task.Env['PORT']).toBe('3000');
    });

    test('filters empty environment variable keys', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                tasks: [{
                    ...defaultTask,
                    envVars: [
                        { key: 'VALID', value: 'yes' },
                        { key: '', value: 'ignored' },
                        { key: '  ', value: 'also-ignored' },
                    ],
                }],
            }],
        });
        const result = createJobSpec(formData);
        const task = result.Job.TaskGroups[0].Tasks[0];

        expect(Object.keys(task.Env)).toHaveLength(1);
        expect(task.Env['VALID']).toBe('yes');
    });

    test('includes docker auth for private registry', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                tasks: [{
                    ...defaultTask,
                    usePrivateRegistry: true,
                    dockerAuth: { username: 'user', password: 'pass' },
                }],
            }],
        });
        const result = createJobSpec(formData);
        const task = result.Job.TaskGroups[0].Tasks[0];

        expect(task.Config.auth).toBeDefined();
        expect(task.Config.auth?.username).toBe('user');
        expect(task.Config.auth?.password).toBe('pass');
    });

    test('creates network config with bridge mode', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [{ label: 'http', value: 8080, to: 8080, static: false }],
            }],
        });
        const result = createJobSpec(formData);
        const taskGroup = result.Job.TaskGroups[0];

        expect(taskGroup.Networks).toBeDefined();
        expect(taskGroup.Networks).toHaveLength(1);
        expect(taskGroup.Networks![0].Mode).toBe('bridge');
    });

    test('creates dynamic ports correctly', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [{ label: 'http', value: 0, to: 8080, static: false }],
            }],
        });
        const result = createJobSpec(formData);
        const network = result.Job.TaskGroups[0].Networks![0];

        expect(network.DynamicPorts).toHaveLength(1);
        expect(network.DynamicPorts[0].Label).toBe('http');
        expect(network.DynamicPorts[0].To).toBe(8080);
        expect(network.ReservedPorts).toHaveLength(0);
    });

    test('creates static ports correctly', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [{ label: 'http', value: 80, to: 8080, static: true }],
            }],
        });
        const result = createJobSpec(formData);
        const network = result.Job.TaskGroups[0].Networks![0];

        expect(network.ReservedPorts).toHaveLength(1);
        expect(network.ReservedPorts[0].Label).toBe('http');
        expect(network.ReservedPorts[0].Value).toBe(80);
        expect(network.DynamicPorts).toHaveLength(0);
    });

    test('skips ports with empty labels', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [
                    { label: 'http', value: 80, to: 8080, static: false },
                    { label: '', value: 443, to: 443, static: true },
                ],
            }],
        });
        const result = createJobSpec(formData);
        const network = result.Job.TaskGroups[0].Networks![0];

        expect(network.DynamicPorts).toHaveLength(1);
        expect(network.ReservedPorts).toHaveLength(0);
    });

    test('creates health check configuration', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [{ label: 'http', value: 0, to: 8080, static: false }],
                enableHealthCheck: true,
                healthCheck: {
                    type: 'http',
                    path: '/health',
                    interval: 30,
                    timeout: 5,
                    initialDelay: 10,
                    failuresBeforeUnhealthy: 3,
                    ignoreWarnings: false,
                },
            }],
        });
        const result = createJobSpec(formData);
        const services = result.Job.TaskGroups[0].Services;

        expect(services).toBeDefined();
        expect(services).toHaveLength(1);
        expect(services![0].Checks).toBeDefined();
        expect(services![0].Checks).toHaveLength(1);
        expect(services![0].Checks![0].Type).toBe('http');
        expect(services![0].Checks![0].Path).toBe('/health');
        expect(services![0].Checks![0].Interval).toBe(30000000000); // nanoseconds
        expect(services![0].Checks![0].Timeout).toBe(5000000000);
    });

    test('uses failuresBeforeUnhealthy for CheckRestart.Limit', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [{ label: 'http', value: 0, to: 8080, static: false }],
                enableHealthCheck: true,
                healthCheck: {
                    type: 'http',
                    path: '/health',
                    interval: 30,
                    timeout: 5,
                    initialDelay: 15,
                    failuresBeforeUnhealthy: 5,
                    ignoreWarnings: false,
                },
            }],
        });
        const result = createJobSpec(formData);
        const check = result.Job.TaskGroups[0].Services![0].Checks![0];

        expect(check.CheckRestart.Limit).toBe(5);
        expect(check.CheckRestart.Grace).toBe(15000000000); // 15s in nanoseconds
    });

    test('uses ignoreWarnings for CheckRestart.IgnoreWarnings', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [{ label: 'http', value: 0, to: 8080, static: false }],
                enableHealthCheck: true,
                healthCheck: {
                    type: 'http',
                    path: '/health',
                    interval: 30,
                    timeout: 5,
                    initialDelay: 5,
                    failuresBeforeUnhealthy: 3,
                    ignoreWarnings: true,
                },
            }],
        });
        const result = createJobSpec(formData);
        const check = result.Job.TaskGroups[0].Services![0].Checks![0];

        expect(check.CheckRestart.IgnoreWarnings).toBe(true);
    });

    test('with failuresBeforeUnhealthy 0 produces Limit 0 (disables restart)', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [{ label: 'http', value: 0, to: 8080, static: false }],
                enableHealthCheck: true,
                healthCheck: {
                    type: 'http',
                    path: '/health',
                    interval: 30,
                    timeout: 5,
                    initialDelay: 5,
                    failuresBeforeUnhealthy: 0,
                    ignoreWarnings: false,
                },
            }],
        });
        const result = createJobSpec(formData);
        const check = result.Job.TaskGroups[0].Services![0].Checks![0];

        expect(check.CheckRestart.Limit).toBe(0);
    });

    test('uses method for HTTP health check', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [{ label: 'http', value: 0, to: 8080, static: false }],
                enableHealthCheck: true,
                healthCheck: {
                    type: 'http',
                    path: '/health',
                    method: 'HEAD',
                    interval: 30,
                    timeout: 5,
                    initialDelay: 5,
                    failuresBeforeUnhealthy: 3,
                    ignoreWarnings: false,
                },
            }],
        });
        const result = createJobSpec(formData);
        const check = result.Job.TaskGroups[0].Services![0].Checks![0];

        expect(check.Method).toBe('HEAD');
    });

    test('defaults method to GET when not specified', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [{ label: 'http', value: 0, to: 8080, static: false }],
                enableHealthCheck: true,
                healthCheck: {
                    type: 'http',
                    path: '/health',
                    interval: 30,
                    timeout: 5,
                    initialDelay: 5,
                    failuresBeforeUnhealthy: 3,
                    ignoreWarnings: false,
                },
            }],
        });
        const result = createJobSpec(formData);
        const check = result.Job.TaskGroups[0].Services![0].Checks![0];

        expect(check.Method).toBeUndefined();
    });

    test('creates service with Traefik tags for simple mode ingress', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [{ label: 'http', value: 0, to: 8080, static: false }],
                enableService: true,
                serviceConfig: {
                    name: 'my-service',
                    portLabel: 'http',
                    provider: 'nomad',
                    addressMode: 'alloc',
                    tags: [],
                    useAdvancedMode: false,
                    ingress: {
                        enabled: true,
                        domain: 'myapp.example.com',
                        enableHttps: true,
                        pathPrefix: '/api',
                    },
                },
            }],
        });
        const result = createJobSpec(formData);
        const service = result.Job.TaskGroups[0].Services![0];

        expect(service.Tags).toBeDefined();
        expect(service.Tags).toContain('traefik.enable=true');
        expect(service.Tags!.some(t => t.includes('myapp.example.com'))).toBe(true);
        expect(service.Tags!.some(t => t.includes('PathPrefix'))).toBe(true);
        expect(service.Tags!.some(t => t.includes('websecure'))).toBe(true);
        expect(service.Tags!.some(t => t.includes('certresolver'))).toBe(true);
    });

    test('uses raw tags in advanced mode', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                enableNetwork: true,
                networkMode: 'bridge',
                ports: [{ label: 'http', value: 0, to: 8080, static: false }],
                enableService: true,
                serviceConfig: {
                    name: 'my-service',
                    portLabel: 'http',
                    provider: 'nomad',
                    addressMode: 'alloc',
                    tags: [
                        { key: 'custom.tag', value: 'value1' },
                        { key: 'another.tag', value: '' },
                    ],
                    useAdvancedMode: true,
                    ingress: { enabled: false, domain: '', enableHttps: false },
                },
            }],
        });
        const result = createJobSpec(formData);
        const service = result.Job.TaskGroups[0].Services![0];

        expect(service.Tags).toContain('custom.tag=value1');
        expect(service.Tags).toContain('another.tag');
    });

    test('creates multiple tasks per group', () => {
        const formData = createMinimalFormData({
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                tasks: [
                    { ...defaultTask, name: 'web', image: 'nginx:latest' },
                    { ...defaultTask, name: 'sidecar', image: 'envoy:latest', plugin: 'docker' },
                ],
            }],
        });
        const result = createJobSpec(formData);
        const taskGroup = result.Job.TaskGroups[0];

        expect(taskGroup.Tasks).toHaveLength(2);
        expect(taskGroup.Tasks[0].Name).toBe('web');
        expect(taskGroup.Tasks[0].Config.image).toBe('nginx:latest');
        expect(taskGroup.Tasks[1].Name).toBe('sidecar');
        expect(taskGroup.Tasks[1].Config.image).toBe('envoy:latest');
    });
});

describe('updateJobSpec', () => {
    test('preserves original job ID and name', () => {
        const originalJob: Partial<NomadJob> = {
            ID: 'original-id',
            Name: 'original-name',
            Namespace: 'default',
        };
        const formData = createMinimalFormData({ name: 'new-name' });
        const result = updateJobSpec(originalJob as NomadJob, formData);

        expect(result.Job.ID).toBe('original-id');
        expect(result.Job.Name).toBe('original-name');
    });

    test('preserves original job metadata', () => {
        const originalJob: Partial<NomadJob> = {
            ID: 'test-job',
            Name: 'test-job',
            Namespace: 'default',
            Meta: { version: '1.0', team: 'platform' },
        };
        const formData = createMinimalFormData();
        const result = updateJobSpec(originalJob as NomadJob, formData);

        expect(result.Job.Meta).toEqual({ version: '1.0', team: 'platform' });
    });

    test('preserves original job priority', () => {
        const originalJob: Partial<NomadJob> = {
            ID: 'test-job',
            Name: 'test-job',
            Namespace: 'default',
            Priority: 75,
        };
        const formData = createMinimalFormData();
        const result = updateJobSpec(originalJob as NomadJob, formData);

        expect(result.Job.Priority).toBe(75);
    });

    test('handles null original job', () => {
        const formData = createMinimalFormData();
        const result = updateJobSpec(null, formData);

        expect(result.Job.ID).toBe('test-job');
        expect(result.Job.Name).toBe('test-job');
    });
});

describe('convertJobToFormData', () => {
    test('provides default healthCheck object when job has no checks', () => {
        const job: Partial<NomadJob> = {
            ID: 'test',
            Name: 'test',
            Namespace: 'default',
            TaskGroups: [{
                Name: 'web',
                Count: 1,
                Tasks: [{
                    Name: 'web',
                    Driver: 'docker',
                    Config: { image: 'nginx' },
                    Resources: { CPU: 100, MemoryMB: 256, DiskMB: 500 },
                }],
            }],
        };
        const result = convertJobToFormData(job as NomadJob);

        expect(result.taskGroups[0].enableHealthCheck).toBe(false);
        expect(result.taskGroups[0].healthCheck).toBeDefined();
        expect(result.taskGroups[0].healthCheck?.type).toBe('http');
        expect(result.taskGroups[0].healthCheck?.interval).toBe(30);
    });

    test('converts basic job structure', () => {
        const job: Partial<NomadJob> = {
            ID: 'api-server',
            Name: 'api-server',
            Namespace: 'production',
            Datacenters: ['dc1', 'dc2'],
            TaskGroups: [{
                Name: 'api',
                Count: 3,
                Tasks: [{
                    Name: 'api',
                    Driver: 'docker',
                    Config: { image: 'api:v1.0' },
                    Resources: { CPU: 500, MemoryMB: 512, DiskMB: 1000 },
                }],
            }],
        };
        const result = convertJobToFormData(job as NomadJob);

        expect(result.name).toBe('api-server');
        expect(result.namespace).toBe('production');
        expect(result.datacenters).toEqual(['dc1', 'dc2']);
        expect(result.taskGroups).toHaveLength(1);
        expect(result.taskGroups[0].name).toBe('api');
        expect(result.taskGroups[0].count).toBe(3);
        expect(result.taskGroups[0].tasks[0].image).toBe('api:v1.0');
    });

    test('extracts environment variables sorted alphabetically', () => {
        const job: Partial<NomadJob> = {
            ID: 'test',
            Name: 'test',
            Namespace: 'default',
            TaskGroups: [{
                Name: 'app',
                Count: 1,
                Tasks: [{
                    Name: 'app',
                    Driver: 'docker',
                    Config: { image: 'app:latest' },
                    Resources: { CPU: 100, MemoryMB: 256, DiskMB: 500 },
                    Env: { ZEBRA: 'z', APPLE: 'a', MIDDLE: 'm' },
                }],
            }],
        };
        const result = convertJobToFormData(job as NomadJob);
        const taskEnvVars = result.taskGroups[0].tasks[0].envVars;

        expect(taskEnvVars).toHaveLength(3);
        expect(taskEnvVars[0].key).toBe('APPLE');
        expect(taskEnvVars[1].key).toBe('MIDDLE');
        expect(taskEnvVars[2].key).toBe('ZEBRA');
    });

    test('extracts network configuration', () => {
        const job: Partial<NomadJob> = {
            ID: 'test',
            Name: 'test',
            Namespace: 'default',
            TaskGroups: [{
                Name: 'web',
                Count: 1,
                Tasks: [{
                    Name: 'web',
                    Driver: 'docker',
                    Config: { image: 'nginx' },
                    Resources: { CPU: 100, MemoryMB: 256, DiskMB: 500 },
                }],
                Networks: [{
                    Mode: 'bridge',
                    DynamicPorts: [{ Label: 'http', To: 8080 }],
                    ReservedPorts: [{ Label: 'admin', Value: 9000, To: 9000 }],
                }],
            }],
        };
        const result = convertJobToFormData(job as NomadJob);

        expect(result.taskGroups[0].enableNetwork).toBe(true);
        expect(result.taskGroups[0].networkMode).toBe('bridge');
        expect(result.taskGroups[0].ports).toHaveLength(2);

        const httpPort = result.taskGroups[0].ports.find(p => p.label === 'http');
        expect(httpPort?.static).toBe(false);
        expect(httpPort?.to).toBe(8080);

        const adminPort = result.taskGroups[0].ports.find(p => p.label === 'admin');
        expect(adminPort?.static).toBe(true);
        expect(adminPort?.value).toBe(9000);
    });

    test('extracts docker auth for private registry', () => {
        const job: Partial<NomadJob> = {
            ID: 'test',
            Name: 'test',
            Namespace: 'default',
            TaskGroups: [{
                Name: 'app',
                Count: 1,
                Tasks: [{
                    Name: 'app',
                    Driver: 'docker',
                    Config: {
                        image: 'private.registry.com/app:v1',
                        auth: { username: 'deploy', password: 'secret' },
                    },
                    Resources: { CPU: 100, MemoryMB: 256, DiskMB: 500 },
                }],
            }],
        };
        const result = convertJobToFormData(job as NomadJob);
        const task = result.taskGroups[0].tasks[0];

        expect(task.usePrivateRegistry).toBe(true);
        expect(task.dockerAuth?.username).toBe('deploy');
        expect(task.dockerAuth?.password).toBe('secret');
    });

    test('extracts CheckRestart.Limit into failuresBeforeUnhealthy', () => {
        const job: Partial<NomadJob> = {
            ID: 'test',
            Name: 'test',
            Namespace: 'default',
            TaskGroups: [{
                Name: 'web',
                Count: 1,
                Tasks: [{
                    Name: 'web',
                    Driver: 'docker',
                    Config: { image: 'nginx' },
                    Resources: { CPU: 100, MemoryMB: 256, DiskMB: 500 },
                }],
                Services: [{
                    Name: 'web-service',
                    Checks: [{
                        Type: 'http',
                        Path: '/health',
                        Interval: 30000000000,
                        Timeout: 5000000000,
                        CheckRestart: {
                            Limit: 7,
                            Grace: 10000000000,
                            IgnoreWarnings: false,
                        },
                    }],
                }],
            }],
        };
        const result = convertJobToFormData(job as NomadJob);
        const hc = result.taskGroups[0].healthCheck;

        expect(hc?.failuresBeforeUnhealthy).toBe(7);
        expect(hc?.initialDelay).toBe(10);
    });

    test('extracts CheckRestart.IgnoreWarnings into ignoreWarnings', () => {
        const job: Partial<NomadJob> = {
            ID: 'test',
            Name: 'test',
            Namespace: 'default',
            TaskGroups: [{
                Name: 'web',
                Count: 1,
                Tasks: [{
                    Name: 'web',
                    Driver: 'docker',
                    Config: { image: 'nginx' },
                    Resources: { CPU: 100, MemoryMB: 256, DiskMB: 500 },
                }],
                Services: [{
                    Name: 'web-service',
                    Checks: [{
                        Type: 'http',
                        Path: '/health',
                        Interval: 30000000000,
                        Timeout: 5000000000,
                        CheckRestart: {
                            Limit: 3,
                            Grace: 5000000000,
                            IgnoreWarnings: true,
                        },
                    }],
                }],
            }],
        };
        const result = convertJobToFormData(job as NomadJob);

        expect(result.taskGroups[0].healthCheck?.ignoreWarnings).toBe(true);
    });

    test('extracts Method into method field', () => {
        const job: Partial<NomadJob> = {
            ID: 'test',
            Name: 'test',
            Namespace: 'default',
            TaskGroups: [{
                Name: 'web',
                Count: 1,
                Tasks: [{
                    Name: 'web',
                    Driver: 'docker',
                    Config: { image: 'nginx' },
                    Resources: { CPU: 100, MemoryMB: 256, DiskMB: 500 },
                }],
                Services: [{
                    Name: 'web-service',
                    Checks: [{
                        Type: 'http',
                        Path: '/health',
                        Method: 'HEAD',
                        Interval: 30000000000,
                        Timeout: 5000000000,
                    }],
                }],
            }],
        };
        const result = convertJobToFormData(job as NomadJob);

        expect(result.taskGroups[0].healthCheck?.method).toBe('HEAD');
    });

    test('converts multiple tasks per group', () => {
        const job: Partial<NomadJob> = {
            ID: 'test',
            Name: 'test',
            Namespace: 'default',
            TaskGroups: [{
                Name: 'app',
                Count: 1,
                Tasks: [
                    {
                        Name: 'web',
                        Driver: 'docker',
                        Config: { image: 'nginx:latest' },
                        Resources: { CPU: 200, MemoryMB: 512, DiskMB: 500 },
                    },
                    {
                        Name: 'sidecar',
                        Driver: 'docker',
                        Config: { image: 'envoy:latest' },
                        Resources: { CPU: 100, MemoryMB: 128, DiskMB: 300 },
                    },
                ],
            }],
        };
        const result = convertJobToFormData(job as NomadJob);

        expect(result.taskGroups[0].tasks).toHaveLength(2);
        expect(result.taskGroups[0].tasks[0].name).toBe('web');
        expect(result.taskGroups[0].tasks[0].image).toBe('nginx:latest');
        expect(result.taskGroups[0].tasks[1].name).toBe('sidecar');
        expect(result.taskGroups[0].tasks[1].image).toBe('envoy:latest');
        expect(result.taskGroups[0].tasks[1].resources.MemoryMB).toBe(128);
    });
});

describe('prepareCloneFormData', () => {
    test('generates clone name with -copy-1 suffix', () => {
        const formData = createMinimalFormData({ name: 'myapp' });
        const result = prepareCloneFormData(formData);

        expect(result.name).toBe('myapp-copy-1');
    });

    test('increments existing copy number', () => {
        const formData = createMinimalFormData({ name: 'myapp-copy-1' });
        const result = prepareCloneFormData(formData);

        expect(result.name).toBe('myapp-copy-2');
    });

    test('updates task group names', () => {
        const formData = createMinimalFormData({
            name: 'myapp',
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                name: 'api',
            }],
        });
        const result = prepareCloneFormData(formData);

        expect(result.taskGroups[0].name).toBe('api-copy-1');
    });

    test('updates service name', () => {
        const formData = createMinimalFormData({
            name: 'myapp',
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                name: 'api',
                enableService: true,
                serviceConfig: {
                    name: 'api-service',
                    portLabel: 'http',
                    provider: 'nomad',
                    addressMode: 'alloc',
                    tags: [],
                    useAdvancedMode: false,
                    ingress: { enabled: false, domain: '', enableHttps: false },
                },
            }],
        });
        const result = prepareCloneFormData(formData);

        expect(result.taskGroups[0].serviceConfig?.name).toBe('api-service-copy-1');
    });

    test('updates ingress domain', () => {
        const formData = createMinimalFormData({
            name: 'myapp',
            taskGroups: [{
                ...createMinimalFormData().taskGroups[0],
                name: 'api',
                enableService: true,
                serviceConfig: {
                    name: 'api-service',
                    portLabel: 'http',
                    provider: 'nomad',
                    addressMode: 'alloc',
                    tags: [],
                    useAdvancedMode: false,
                    ingress: {
                        enabled: true,
                        domain: 'api.example.com',
                        enableHttps: true,
                    },
                },
            }],
        });
        const result = prepareCloneFormData(formData);

        expect(result.taskGroups[0].serviceConfig?.ingress?.domain).toBe('api-copy-1.example.com');
    });

    test('preserves other form data properties', () => {
        const formData = createMinimalFormData({
            namespace: 'production',
            datacenters: ['dc1', 'dc2'],
        });
        const result = prepareCloneFormData(formData);

        expect(result.namespace).toBe('production');
        expect(result.datacenters).toEqual(['dc1', 'dc2']);
    });
});
