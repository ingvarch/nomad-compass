import type { NomadJobListStub } from '../../types/nomad';
import { listedJobs } from './jobKind';

/** Skips periodic launches and dispatched jobs, to match the jobs list. */
export function countJobsByStatus(jobs: NomadJobListStub[]) {
  let running = 0;
  let pending = 0;
  let dead = 0;

  listedJobs(jobs).forEach((job) => {
    switch (job.Status) {
      case 'running':
        running++;
        break;
      case 'pending':
        pending++;
        break;
      case 'dead':
        dead++;
        break;
    }
  });

  return { running, pending, dead };
}

/** Skips periodic launches and dispatched jobs, to match the jobs list. */
export function countJobsByNamespace(jobs: NomadJobListStub[]): Map<string, { total: number; running: number }> {
  const counts = new Map<string, { total: number; running: number }>();
  listedJobs(jobs).forEach((job) => {
    const current = counts.get(job.Namespace) || { total: 0, running: 0 };
    current.total++;
    if (job.Status === 'running') current.running++;
    counts.set(job.Namespace, current);
  });
  return counts;
}
