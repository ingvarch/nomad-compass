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
