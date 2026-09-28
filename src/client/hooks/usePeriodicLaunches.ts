import { createNomadClient } from '../lib/api/nomad';
import { sortLaunchesNewestFirst } from '../lib/services/periodicService';
import type { NomadJobListStub } from '../types/nomad';
import { useFetch } from './useFetch';

/**
 * Launches of a periodic job, newest first. Loads nothing when `enabled` is false.
 */
export function usePeriodicLaunches(jobId: string, namespace: string, enabled: boolean) {
  return useFetch<NomadJobListStub[]>(
    async () => {
      if (!enabled) return [];
      const launches = await createNomadClient().getPeriodicLaunches(jobId, namespace);
      return sortLaunchesNewestFirst(launches || []);
    },
    [jobId, namespace, enabled],
    { initialData: [], errorMessage: 'Failed to load launches' }
  );
}
