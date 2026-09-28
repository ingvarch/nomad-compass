import type { NomadPeriodicConfig } from '../../types/nomad';

/**
 * Cron expressions of a periodic block, from `crons` or the deprecated `cron`.
 */
export function cronsOf(periodic: NomadPeriodicConfig): string[] {
  if (periodic.Specs && periodic.Specs.length > 0) return periodic.Specs;
  return periodic.Spec ? [periodic.Spec] : [];
}
