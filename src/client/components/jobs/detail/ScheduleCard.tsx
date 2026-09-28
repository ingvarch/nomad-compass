import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../ui';
import type { BadgeColorVariant } from '../../ui/badgeColors';
import { cronsOf, type ScheduleState } from '../../../lib/services/periodicService';
import { formatDateLongZoned, formatIsoDateLong } from '../../../lib/utils/dateFormatter';
import { jobPath } from '../../../lib/utils/jobPath';
import type { NomadJobListStub, NomadPeriodicConfig } from '../../../types/nomad';

interface ScheduleCardProps {
  periodic: NomadPeriodicConfig;
  state: ScheduleState;
  nextLaunch: string | null;
  nextLaunchError: string | null;
  lastLaunch?: NomadJobListStub;
  launchesLoading: boolean;
  launchesError: string | null;
}

const stateBadges: Record<ScheduleState, { label: string; variant: BadgeColorVariant }> = {
  active: { label: 'Active', variant: 'green' },
  paused: { label: 'Paused', variant: 'yellow' },
  stopped: { label: 'Stopped', variant: 'gray' },
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{children}</dd>
    </div>
  );
}

function Unavailable({ reason }: { reason: string }) {
  return (
    <>
      <div>Unavailable</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{reason}</div>
    </>
  );
}

function LastLaunch({ launch, loading, error }: { launch?: NomadJobListStub; loading: boolean; error: string | null }) {
  if (error) return <Unavailable reason={error} />;
  // The previous launch stays visible while the list reloads
  if (launch) {
    return (
      <Link
        to={jobPath(launch.ID, launch.Namespace)}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {formatDateLongZoned(launch.SubmitTime)}
      </Link>
    );
  }
  if (loading) return <>-</>;
  return <>No launches yet</>;
}

export function ScheduleCard({
  periodic,
  state,
  nextLaunch,
  nextLaunchError,
  lastLaunch,
  launchesLoading,
  launchesError,
}: ScheduleCardProps) {
  const badge = stateBadges[state];
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Schedule</h3>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <dl className="py-2">
        <Row label="Cron">
          {cronsOf(periodic).map((cron) => (
            <div key={cron} className="font-mono">
              {cron}
            </div>
          ))}
        </Row>
        <Row label="Time zone">{periodic.TimeZone || 'UTC'}</Row>
        <Row label="Overlap">
          {periodic.ProhibitOverlap ? 'Skips a run while the previous one is running' : 'Runs may overlap'}
        </Row>
        {state === 'active' && (
          <Row label="Next launch">
            {nextLaunchError ? (
              <Unavailable reason={nextLaunchError} />
            ) : nextLaunch ? (
              formatIsoDateLong(nextLaunch)
            ) : (
              '-'
            )}
          </Row>
        )}
        <Row label="Last launch">
          <LastLaunch launch={lastLaunch} loading={launchesLoading} error={launchesError} />
        </Row>
      </dl>
    </div>
  );
}
