import React from 'react';
import {
  getAllocationStatusColor,
  getNodeStatusColor,
  getServerStatusColor,
  getEvaluationStatusColor,
  getStatusClasses,
  type StatusColorConfig,
} from '../../lib/utils/statusColors';

type StatusType = 'allocation' | 'node' | 'server' | 'evaluation' | 'custom';

interface StatusBadgeProps {
  /** The status text to display */
  status: string;
  /** Type of status to determine color scheme */
  type: StatusType;
  /** For node status - whether node is draining */
  isDraining?: boolean;
  /** Custom color config (when type is 'custom') */
  colorConfig?: StatusColorConfig;
  /** Additional CSS classes */
  className?: string;
  /** Show a status dot before the text */
  showDot?: boolean;
}

/**
 * Generic status badge component that works with different Nomad entity types.
 * Uses the centralized statusColors utilities for consistent styling.
 */
export function StatusBadge({
  status,
  type,
  isDraining,
  colorConfig,
  className = '',
  showDot = false,
}: StatusBadgeProps) {
  const getColorConfig = (): StatusColorConfig => {
    switch (type) {
      case 'allocation':
        return getAllocationStatusColor(status);
      case 'node':
        return getNodeStatusColor(status, isDraining);
      case 'server':
        return getServerStatusColor(status);
      case 'evaluation':
        return getEvaluationStatusColor(status);
      case 'custom':
        return colorConfig || { bg: 'bg-gray-100 dark:bg-gray-600', text: 'text-gray-800 dark:text-gray-200' };
    }
  };

  const config = getColorConfig();
  const baseClasses = 'px-2 py-0.5 text-xs font-medium rounded-full inline-flex items-center';

  return (
    <span className={`${baseClasses} ${getStatusClasses(config)} ${className}`}>
      {showDot && config.dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.dot}`} />
      )}
      {status}
    </span>
  );
}
