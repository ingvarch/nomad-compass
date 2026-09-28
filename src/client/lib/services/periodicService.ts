import type { NomadPeriodicConfig } from '../../types/nomad';

/**
 * Cron expressions of a periodic block, from `crons` or the deprecated `cron`.
 */
export function cronsOf(periodic: NomadPeriodicConfig): string[] {
  if (periodic.Specs && periodic.Specs.length > 0) return periodic.Specs;
  return periodic.Spec ? [periodic.Spec] : [];
}

export function periodicLaunchPrefix(jobId: string): string {
  return `${jobId}/periodic-`;
}

/**
 * A launch is the child job Nomad creates for each run of a periodic job.
 */
export function isPeriodicLaunch(job: { ID: string; ParentID?: string }): boolean {
  return !!job.ParentID && job.ID.startsWith(periodicLaunchPrefix(job.ParentID));
}

/**
 * Jobs the lists show: launches are listed on their parent's page.
 */
export function listedJobs<T extends { ID: string; ParentID?: string }>(jobs: T[]): T[] {
  return jobs.filter((job) => !isPeriodicLaunch(job));
}
