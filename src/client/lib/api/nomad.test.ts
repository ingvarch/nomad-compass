import { describe, test, expect } from 'bun:test';
import { NomadClient } from './nomad';
import { mockFetch } from '../../../test/mockFetch';
import type { NomadJob } from '../../types/nomad';

const id = 'backup/periodic-1790611797';
const encoded = 'backup%2Fperiodic-1790611797';

describe('NomadClient job endpoints', () => {
  test('encode the job ID as one path segment', async () => {
    const calls = mockFetch();
    const client = new NomadClient();

    await client.getJob(id, 'default');
    await client.getJobVersions(id, 'default');
    await client.getJobEvaluations(id, 'default');
    await client.getJobAllocations(id, 'default');
    await client.planJob(id, { Job: {} as NomadJob }, 'default');
    await client.revertJob(id, 1, 'default');
    await client.stopJob(id, 'default');
    await client.deleteJob(id, 'default');

    expect(calls.map((call) => call.url)).toEqual([
      `/api/nomad/v1/job/${encoded}?namespace=default`,
      `/api/nomad/v1/job/${encoded}/versions?namespace=default`,
      `/api/nomad/v1/job/${encoded}/evaluations?namespace=default`,
      `/api/nomad/v1/job/${encoded}/allocations?namespace=default`,
      `/api/nomad/v1/job/${encoded}/plan?namespace=default`,
      `/api/nomad/v1/job/${encoded}/revert?namespace=default`,
      `/api/nomad/v1/job/${encoded}?namespace=default`,
      `/api/nomad/v1/job/${encoded}?namespace=default&purge=true`,
    ]);
  });
});

describe('NomadClient periodic jobs', () => {
  test('forces a launch', async () => {
    const calls = mockFetch(() => ({ body: { EvalID: 'e1', EvalCreateIndex: 1 } }));
    const result = await new NomadClient().forcePeriodicLaunch('backup', 'default');

    expect(calls[0]).toMatchObject({ method: 'POST', url: '/api/nomad/v1/job/backup/periodic/force?namespace=default' });
    expect(result.EvalID).toBe('e1');
  });

  test('lists launches by ID prefix', async () => {
    const calls = mockFetch(() => ({ body: [] }));
    await new NomadClient().getPeriodicLaunches('backup', 'default');

    expect(calls[0].url).toBe('/api/nomad/v1/jobs?namespace=default&prefix=backup%2Fperiodic-');
  });
});

describe('NomadClient variables endpoints', () => {
  test('lists, reads, puts and deletes variables', async () => {
    const calls = mockFetch(() => ({ body: [] }));
    const client = new NomadClient();

    await client.getVariables('prod', 'nomad/jobs');
    await client.getVariable('nomad/jobs/my-app', 'prod');
    await client.putVariable({
      Path: 'nomad/jobs/my-app',
      Namespace: 'prod',
      Items: { FOO: 'bar' },
    });
    await client.deleteVariable('nomad/jobs/my-app', 'prod');

    expect(calls.map((c) => ({ method: c.method || 'GET', url: c.url }))).toEqual([
      { method: 'GET', url: '/api/nomad/v1/vars?namespace=prod&prefix=nomad%2Fjobs' },
      { method: 'GET', url: '/api/nomad/v1/var/nomad/jobs/my-app?namespace=prod' },
      { method: 'PUT', url: '/api/nomad/v1/var/nomad/jobs/my-app?namespace=prod' },
      { method: 'DELETE', url: '/api/nomad/v1/var/nomad/jobs/my-app?namespace=prod' },
    ]);
  });
});

describe('NomadClient node pools endpoints', () => {
  test('lists, reads, creates, deletes node pools, and lists pool nodes', async () => {
    const calls = mockFetch(() => ({ body: [] }));
    const client = new NomadClient();

    await client.getNodePools();
    await client.getNodePool('prod-eng');
    await client.createOrUpdateNodePool({
      Name: 'prod-eng',
      Description: 'Production workloads',
      SchedulerConfiguration: { SchedulerAlgorithm: 'spread' },
    });
    await client.getNodePoolNodes('prod-eng');
    await client.deleteNodePool('prod-eng');

    expect(calls.map((c) => ({ method: c.method || 'GET', url: c.url }))).toEqual([
      { method: 'GET', url: '/api/nomad/v1/node/pools' },
      { method: 'GET', url: '/api/nomad/v1/node/pool/prod-eng' },
      { method: 'POST', url: '/api/nomad/v1/node/pool/prod-eng' },
      { method: 'GET', url: '/api/nomad/v1/node/pool/prod-eng/nodes' },
      { method: 'DELETE', url: '/api/nomad/v1/node/pool/prod-eng' },
    ]);
  });
});

describe('NomadClient deployments & canary endpoints', () => {
  test('gets job deployment, promotes canary, pauses and fails deployment', async () => {
    const calls = mockFetch(() => ({ body: {} }));
    const client = new NomadClient();

    await client.getJobDeployment('my-app', 'prod');
    await client.getDeployments('prod');
    await client.getDeployment('dep-123');
    await client.promoteDeployment('dep-123', { all: true });
    await client.pauseDeployment('dep-123', true);
    await client.failDeployment('dep-123');

    expect(calls.map((c) => ({ method: c.method || 'GET', url: c.url }))).toEqual([
      { method: 'GET', url: '/api/nomad/v1/job/my-app/deployment?namespace=prod' },
      { method: 'GET', url: '/api/nomad/v1/deployments?namespace=prod' },
      { method: 'GET', url: '/api/nomad/v1/deployment/dep-123' },
      { method: 'POST', url: '/api/nomad/v1/deployment/promote/dep-123' },
      { method: 'POST', url: '/api/nomad/v1/deployment/pause/dep-123' },
      { method: 'POST', url: '/api/nomad/v1/deployment/fail/dep-123' },
    ]);
  });
});
