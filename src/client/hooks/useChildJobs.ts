import { createNomadClient } from '../lib/api/nomad';
import { sortLaunchesNewestFirst } from '../lib/services/periodicService';
import type { JobKind } from '../lib/services/jobKind';
import type { NomadJobListStub } from '../types/nomad';
import { useFetch } from './useFetch';

/**
 * Launches of a periodic job or dispatched jobs of a parameterized one, newest first.
 * Loads nothing for a regular job.
 */
export function useChildJobs(jobId: string, namespace: string, kind: JobKind) {
  return useFetch<NomadJobListStub[]>(
    async () => {
      if (kind === 'regular') return [];
      const client = createNomadClient();
      const children = kind === 'periodic'
        ? await client.getPeriodicLaunches(jobId, namespace)
        : await client.getDispatchedJobs(jobId, namespace);
      return sortLaunchesNewestFirst(children || []);
    },
    [jobId, namespace, kind],
    { initialData: [], errorMessage: kind === 'periodic' ? 'Failed to load launches' : 'Failed to load dispatched jobs' }
  );
}
