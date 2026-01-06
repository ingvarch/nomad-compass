import React from 'react';
import type { NomadAllocation } from '../../../types/nomad';
import {
  jobStatusColors,
  getStatusClasses,
  type JobStatus,
  type StatusColorConfig,
} from '../../../lib/utils/statusColors';

interface StatusBadgeProps {
  status: string;
  isStopped?: boolean;
  allocations?: NomadAllocation[];
}

type EffectiveStatus = 'running' | 'pending' | 'failed' | 'degraded' | 'stopped' | 'dead';

function computeEffectiveStatus(
  jobStatus: string,
  isStopped?: boolean,
  allocations?: NomadAllocation[]
): EffectiveStatus {
  // If job is stopped, that takes priority
  if (isStopped) {
    return 'stopped';
  }

  // If we have allocations, check their status
  if (allocations && allocations.length > 0) {
    const failedOrLost = allocations.filter(
      (a) => a.ClientStatus === 'failed' || a.ClientStatus === 'lost'
    );
    const running = allocations.filter((a) => a.ClientStatus === 'running');

    // All allocations failed/lost
    if (failedOrLost.length === allocations.length) {
      return 'failed';
    }

    // Some allocations failed but some are running - degraded state
    if (failedOrLost.length > 0 && running.length > 0) {
      return 'degraded';
    }

    // No running allocations and job claims to be running - likely failed
    if (running.length === 0 && jobStatus === 'running') {
      const pending = allocations.filter((a) => a.ClientStatus === 'pending');
      if (pending.length > 0) {
        return 'pending';
      }
      return 'failed';
    }
  }

  // Fall back to job status
  if (jobStatus === 'running') return 'running';
  if (jobStatus === 'pending') return 'pending';
  if (jobStatus === 'dead') return 'dead';

  return 'failed';
}

function getStatusColorConfig(effectiveStatus: EffectiveStatus): StatusColorConfig {
  // Map 'failed' to 'dead' since they share the same color scheme
  const mappedStatus: JobStatus = effectiveStatus === 'failed' ? 'dead' : effectiveStatus;
  return jobStatusColors[mappedStatus];
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isStopped, allocations }) => {
  const effectiveStatus = computeEffectiveStatus(status, isStopped, allocations);
  const colorConfig = getStatusColorConfig(effectiveStatus);

  const getDisplayText = () => {
    if (effectiveStatus === 'stopped') {
      return `${status} (Stopped)`;
    }
    if (effectiveStatus === 'degraded') {
      return 'degraded';
    }
    if (effectiveStatus !== status) {
      return effectiveStatus;
    }
    return status;
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClasses(colorConfig)}`}>
      {getDisplayText()}
    </span>
  );
};

export default StatusBadge;
