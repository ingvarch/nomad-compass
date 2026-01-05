import React from 'react';
import type { NomadAllocation } from '../../../types/nomad';

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

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isStopped, allocations }) => {
  const effectiveStatus = computeEffectiveStatus(status, isStopped, allocations);

  const getStatusClasses = () => {
    switch (effectiveStatus) {
      case 'running':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'stopped':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200';
      case 'degraded':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'failed':
      case 'dead':
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

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
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClasses()}`}>
      {getDisplayText()}
    </span>
  );
};

export default StatusBadge;
