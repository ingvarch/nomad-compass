import { describe, test, expect } from 'bun:test';
import { createJobSpec, updateJobSpec, convertJobToFormData, prepareCloneFormData } from './jobSpecService';
import type { NomadJobFormData, NomadJob } from '../../types/nomad';

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
            image: 'nginx:latest',
            plugin: 'docker',
            resources: { CPU: 100, MemoryMB: 256, DiskMB: 500 },
            envVars: [],
            usePrivateRegistry: false,
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
                resources: { CPU: 500, MemoryMB: 1024, DiskMB: 2000 },
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
                image: 'myapp:v1.2.3',
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
                envVars: [
                    { key: 'NODE_ENV', value: 'production' },
                    { key: 'PORT', value: '3000' },
                ],
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
                envVars: [
                    { key: 'VALID', value: 'yes' },
                    { key: '', value: 'ignored' },
                    { key: '  ', value: 'also-ignored' },
                ],
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
                usePrivateRegistry: true,
                dockerAuth: { username: 'user', password: 'pass' },
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
                    successesBeforeHealthy: 2,
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
        expect(result.taskGroups[0].image).toBe('api:v1.0');
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

        expect(result.taskGroups[0].envVars).toHaveLength(3);
        expect(result.taskGroups[0].envVars[0].key).toBe('APPLE');
        expect(result.taskGroups[0].envVars[1].key).toBe('MIDDLE');
        expect(result.taskGroups[0].envVars[2].key).toBe('ZEBRA');
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

        expect(result.taskGroups[0].usePrivateRegistry).toBe(true);
        expect(result.taskGroups[0].dockerAuth?.username).toBe('deploy');
        expect(result.taskGroups[0].dockerAuth?.password).toBe('secret');
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
