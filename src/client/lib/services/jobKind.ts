import type { NomadJob } from '../../types/nomad';
import { isParameterized } from './dispatchService';

export type JobKind = 'regular' | 'periodic' | 'parameterized';

// A periodic or parameterized job runs as child jobs: launches or dispatched jobs
export type ParentJobKind = Exclude<JobKind, 'regular'>;

export function jobKind(job: Pick<NomadJob, 'Periodic' | 'ParameterizedJob' | 'Dispatched'>): JobKind {
  if (job.Periodic) return 'periodic';
  return isParameterized(job) ? 'parameterized' : 'regular';
}
