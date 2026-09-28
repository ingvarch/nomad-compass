import { useCallback, useState } from 'react';
import { createNomadClient } from '../lib/api/nomad';
import { useToast } from '../context/ToastContext';
import {
  getErrorMessage,
  getPermissionErrorMessage,
  isJobModifyIndexConflict,
  isPermissionError,
} from '../lib/errors';
import { nextPeriodicLaunch, scheduleState, setPeriodicEnabled } from '../lib/services/periodicService';
import type { NomadJob } from '../types/nomad';
import { useFetch } from './useFetch';

// Awaited, so the buttons stay busy until the page shows the new state
interface PeriodicActionHandlers {
  onLaunched: () => void | Promise<void>;
  onScheduleChanged: () => void | Promise<void>;
}

/**
 * Next launch, Run now and Pause/Resume of a periodic job. Pass null for other jobs.
 */
export function usePeriodicActions(job: NomadJob | null, { onLaunched, onScheduleChanged }: PeriodicActionHandlers) {
  const { addToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Nomad computes the next launch only in a plan; a paused or stopped schedule has none
  const nextLaunch = useFetch<string | null>(
    async () => {
      if (!job || scheduleState(job) !== 'active') return null;
      const plan = await createNomadClient().planJob(job.ID, job, job.Namespace, false);
      return nextPeriodicLaunch(plan);
    },
    [job],
    { errorMessage: 'Failed to plan job' }
  );

  const reportError = useCallback(
    (err: unknown, operation: string, fallback: string) => {
      if (isPermissionError(err)) {
        setPermissionError(getPermissionErrorMessage(operation));
      } else {
        addToast(getErrorMessage(err, fallback), 'error');
      }
    },
    [addToast]
  );

  const runNow = useCallback(async () => {
    if (!job) return;
    setIsBusy(true);
    try {
      const { EvalID } = await createNomadClient().forcePeriodicLaunch(job.ID, job.Namespace);
      addToast(`Launch started, evaluation ${EvalID.slice(0, 8)}`, 'success');
      await onLaunched();
    } catch (err) {
      reportError(err, 'run-periodic-job', 'Failed to launch job');
    } finally {
      setIsBusy(false);
    }
  }, [job, addToast, onLaunched, reportError]);

  const togglePause = useCallback(async () => {
    if (!job?.Periodic) return;
    const enable = !job.Periodic.Enabled;
    setIsBusy(true);
    try {
      const client = createNomadClient();
      const current = await client.getJob(job.ID, job.Namespace);
      await client.updateJob(setPeriodicEnabled(current, enable));
      addToast(enable ? 'Schedule resumed' : 'Schedule paused', 'success');
      await onScheduleChanged();
    } catch (err) {
      if (isJobModifyIndexConflict(err)) {
        addToast('Job changed, reload the page', 'error');
      } else {
        reportError(err, 'pause-periodic-job', enable ? 'Failed to resume schedule' : 'Failed to pause schedule');
      }
    } finally {
      setIsBusy(false);
    }
  }, [job, addToast, onScheduleChanged, reportError]);

  return {
    nextLaunch: nextLaunch.data,
    nextLaunchError: nextLaunch.error,
    isBusy,
    permissionError,
    clearPermissionError: () => setPermissionError(null),
    runNow,
    togglePause,
  };
}
