import type { NomadJob } from '../../types/nomad';
import { isDispatchedJob, isParameterized } from './dispatchService';
import { isPeriodicLaunch } from './periodicService';

export type JobKind = 'regular' | 'periodic' | 'parameterized';

// A periodic or parameterized job runs as child jobs: launches or dispatched jobs
export type ParentJobKind = Exclude<JobKind, 'regular'>;

export function jobKind(job: Pick<NomadJob, 'Periodic' | 'ParameterizedJob' | 'Dispatched'>): JobKind {
  if (job.Periodic) return 'periodic';
  return isParameterized(job) ? 'parameterized' : 'regular';
}

/**
 * Jobs the lists show: launches and dispatched jobs are listed on their parent's page.
 */
export function listedJobs<T extends { ID: string; ParentID?: string }>(jobs: T[]): T[] {
  return jobs.filter((job) => !isPeriodicLaunch(job) && !isDispatchedJob(job));
}
