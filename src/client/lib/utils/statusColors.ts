// Status color configurations for different contexts in Nomad Compass

export type AllocationStatus = 'running' | 'pending' | 'complete' | 'failed' | 'lost';
export type JobStatus = 'running' | 'pending' | 'dead' | 'stopped' | 'degraded';
export type NodeStatus = 'ready' | 'down' | 'draining';
export type ServerStatus = 'alive' | 'failed' | 'left';
export type Severity = 'info' | 'warning' | 'error';
export type ClusterHealth = 'healthy' | 'degraded' | 'critical';

export interface StatusColorConfig {
  bg: string;
  text: string;
  dot?: string;
}

// Allocation status colors (used in AllocationsPage, FailedAllocationsPage)
export const allocationStatusColors: Record<AllocationStatus, StatusColorConfig> = {
  running: {
    bg: 'bg-green-100 dark:bg-green-900/50',
    text: 'text-green-800 dark:text-green-200',
    dot: 'bg-green-500',
  },
  pending: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/50',
    text: 'text-yellow-800 dark:text-yellow-200',
    dot: 'bg-yellow-500',
  },
  complete: {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-800 dark:text-blue-200',
    dot: 'bg-blue-500',
  },
  failed: {
    bg: 'bg-red-100 dark:bg-red-900/50',
    text: 'text-red-800 dark:text-red-200',
    dot: 'bg-red-500',
  },
  lost: {
    bg: 'bg-red-100 dark:bg-red-900/50',
    text: 'text-red-800 dark:text-red-200',
    dot: 'bg-red-500',
  },
};

// Job status colors (used in JobList, StatusBadge)
export const jobStatusColors: Record<JobStatus, StatusColorConfig> = {
  running: {
    bg: 'bg-green-100 dark:bg-green-900/50',
    text: 'text-green-800 dark:text-green-200',
  },
  pending: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/50',
    text: 'text-yellow-800 dark:text-yellow-200',
  },
  dead: {
    bg: 'bg-red-100 dark:bg-red-900/50',
    text: 'text-red-800 dark:text-red-200',
  },
  stopped: {
    bg: 'bg-gray-100 dark:bg-gray-600',
    text: 'text-gray-800 dark:text-gray-200',
  },
  degraded: {
    bg: 'bg-orange-100 dark:bg-orange-900/50',
    text: 'text-orange-800 dark:text-orange-200',
  },
};

// Node status colors (used in NodesPage)
export const nodeStatusColors: Record<NodeStatus, StatusColorConfig> = {
  ready: {
    bg: 'bg-green-100 dark:bg-green-900/50',
    text: 'text-green-800 dark:text-green-200',
    dot: 'bg-green-500',
  },
  down: {
    bg: 'bg-red-100 dark:bg-red-900/50',
    text: 'text-red-800 dark:text-red-200',
    dot: 'bg-red-500',
  },
  draining: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/50',
    text: 'text-yellow-800 dark:text-yellow-200',
    dot: 'bg-yellow-500',
  },
};

// Server status colors (used in ServersPage)
export const serverStatusColors: Record<ServerStatus, StatusColorConfig> = {
  alive: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
  },
  failed: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
  },
  left: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-800 dark:text-gray-300',
  },
};

// Event severity colors (used in ActivityPage)
export const severityColors: Record<Severity, StatusColorConfig> = {
  info: {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-800 dark:text-blue-200',
    dot: 'bg-blue-500',
  },
  warning: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/50',
    text: 'text-yellow-800 dark:text-yellow-200',
    dot: 'bg-yellow-500',
  },
  error: {
    bg: 'bg-red-100 dark:bg-red-900/50',
    text: 'text-red-800 dark:text-red-200',
    dot: 'bg-red-500',
  },
};

// Cluster health status (used in ClusterHealth component)
export interface ClusterHealthConfig extends StatusColorConfig {
  pulse: boolean;
  label: string;
}

export const clusterHealthColors: Record<ClusterHealth, ClusterHealthConfig> = {
  healthy: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-200',
    dot: 'bg-green-500',
    pulse: false,
    label: 'Cluster Healthy',
  },
  degraded: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-200',
    dot: 'bg-yellow-500',
    pulse: true,
    label: 'Cluster Degraded',
  },
  critical: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-200',
    dot: 'bg-red-500',
    pulse: true,
    label: 'Cluster Critical',
  },
};

// Default color config for unknown statuses
const defaultStatusColor: StatusColorConfig = {
  bg: 'bg-gray-100 dark:bg-gray-600',
  text: 'text-gray-800 dark:text-gray-200',
};

// Helper functions

export function getAllocationStatusColor(status: string): StatusColorConfig {
  const normalized = status.toLowerCase() as AllocationStatus;
  return allocationStatusColors[normalized] || defaultStatusColor;
}

export function getJobStatusColor(status: string, isStopped?: boolean): StatusColorConfig {
  if (isStopped) return jobStatusColors.stopped;
  const normalized = status.toLowerCase() as JobStatus;
  return jobStatusColors[normalized] || defaultStatusColor;
}

export function getNodeStatusColor(status: string, isDraining?: boolean): StatusColorConfig {
  if (isDraining) return nodeStatusColors.draining;
  const normalized = status.toLowerCase() as NodeStatus;
  return nodeStatusColors[normalized] || defaultStatusColor;
}

export function getServerStatusColor(status: string): StatusColorConfig {
  const normalized = status.toLowerCase() as ServerStatus;
  return serverStatusColors[normalized] || defaultStatusColor;
}

// Evaluation status colors
export function getEvaluationStatusColor(status: string): StatusColorConfig {
  switch (status.toLowerCase()) {
    case 'complete':
      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' };
    case 'pending':
      return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' };
    case 'blocked':
      return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300' };
    case 'failed':
    case 'canceled':
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' };
    default:
      return defaultStatusColor;
  }
}

// Version status colors (for job versions)
export function getVersionStatusColor(stable: boolean): StatusColorConfig {
  return stable
    ? { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' }
    : { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' };
}

// Node eligibility colors
export function getNodeEligibilityColor(eligible: string): StatusColorConfig {
  switch (eligible.toLowerCase()) {
    case 'eligible':
      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' };
    case 'ineligible':
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' };
    default:
      return defaultStatusColor;
  }
}

// Utility to combine bg and text classes
export function getStatusClasses(config: StatusColorConfig): string {
  return `${config.bg} ${config.text}`;
}
