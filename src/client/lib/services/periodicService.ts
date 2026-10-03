import type {
  JobSubmission,
  NomadJob,
  NomadJobListStub,
  NomadJobPlanResponse,
  NomadPeriodicConfig,
} from '../../types/nomad';

export type ScheduleState = 'active' | 'paused' | 'stopped';

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

export function sortLaunchesNewestFirst(launches: NomadJobListStub[]): NomadJobListStub[] {
  return [...launches].sort((a, b) => b.SubmitTime - a.SubmitTime);
}

export function launchAllocationCounts(launch: NomadJobListStub) {
  const counts = { running: 0, complete: 0, failed: 0 };
  Object.values(launch.JobSummary?.Summary ?? {}).forEach((group) => {
    counts.running += group.Running;
    counts.complete += group.Complete;
    counts.failed += group.Failed;
  });
  return counts;
}

/**
 * Registration that pauses or resumes a periodic job. EnforceIndex makes Nomad
 * reject it if the job changed after it was read.
 */
export function setPeriodicEnabled(job: NomadJob, enabled: boolean): JobSubmission {
  if (!job.Periodic) throw new Error(`Job "${job.ID}" is not periodic`);
  return {
    Job: { ...job, Periodic: { ...job.Periodic, Enabled: enabled } },
    EnforceIndex: true,
    JobModifyIndex: job.JobModifyIndex,
  };
}

/**
 * Like Nomad's IsPeriodicActive: a stopped job launches nothing, whatever its schedule says.
 */
export function scheduleState(job: Pick<NomadJob, 'Stop' | 'Periodic'>): ScheduleState {
  if (job.Stop) return 'stopped';
  return job.Periodic?.Enabled ? 'active' : 'paused';
}

/**
 * Next launch from a plan. Nomad 1.x sends the zero time "0001-01-01T00:00:00Z" instead of null.
 */
export function nextPeriodicLaunch(plan: NomadJobPlanResponse): string | null {
  const next = plan.NextPeriodicLaunch;
  return next && Date.parse(next) > 0 ? next : null;
}

// Nomad needs a moment to create the launch and move the next launch on
export const REFRESH_AFTER_LAUNCH_MS = 2000;
// setTimeout fires at once for longer delays
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Milliseconds until the next launch has started and the page can read the one after it.
 */
export function nextLaunchRefreshDelay(nextLaunch: string, now: number = Date.now()): number {
  const delay = Date.parse(nextLaunch) - now + REFRESH_AFTER_LAUNCH_MS;
  return Math.min(Math.max(delay, 0), MAX_TIMEOUT_MS);
}
