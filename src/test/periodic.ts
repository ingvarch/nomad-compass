import { REFRESH_AFTER_LAUNCH_MS } from '../client/lib/services/periodicService';

/**
 * Next launch whose refresh is due in `ms`: pages read the plan again REFRESH_AFTER_LAUNCH_MS after a launch.
 */
export function nextLaunchRefreshedIn(ms: number): string {
  return new Date(Date.now() + ms - REFRESH_AFTER_LAUNCH_MS).toISOString();
}
