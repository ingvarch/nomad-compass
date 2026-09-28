import { CirclePlay, Pause, Play } from 'lucide-react';
import { buttonSecondaryStyles } from '../../../lib/styles';
import type { ScheduleState } from '../../../lib/services/periodicService';

interface PeriodicActionsProps {
  state: ScheduleState;
  // The schedule's own Enabled flag: a stopped job keeps it
  isEnabled: boolean;
  isBusy: boolean;
  onRunNow: () => void;
  onTogglePause: () => void;
}

// Why Run now is disabled
const runNowHints: Record<ScheduleState, string | undefined> = {
  active: undefined,
  paused: 'Resume the schedule to run the job',
  stopped: 'Start the job to run it',
};

const buttonStyles = `${buttonSecondaryStyles} shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`;

/**
 * Header buttons of a periodic job. Nomad rejects Run now while the schedule is paused or the job is stopped.
 */
export function PeriodicActions({ state, isEnabled, isBusy, onRunNow, onTogglePause }: PeriodicActionsProps) {
  const isStopped = state === 'stopped';
  return (
    <>
      <button
        type="button"
        onClick={onRunNow}
        disabled={state !== 'active' || isBusy}
        title={runNowHints[state]}
        className={buttonStyles}
      >
        <Play className="w-4 h-4 mr-1.5" />
        Run now
      </button>
      {/* Pausing a stopped job would register a new version of it */}
      <button
        type="button"
        onClick={onTogglePause}
        disabled={isStopped || isBusy}
        title={isStopped ? 'Start the job to change its schedule' : undefined}
        className={buttonStyles}
      >
        {isEnabled ? <Pause className="w-4 h-4 mr-1.5" /> : <CirclePlay className="w-4 h-4 mr-1.5" />}
        {isEnabled ? 'Pause' : 'Resume'}
      </button>
    </>
  );
}
