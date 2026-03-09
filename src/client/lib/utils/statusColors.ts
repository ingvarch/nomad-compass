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

// Base color palette - single source of truth for status colors
const BASE_COLORS = {
  green: {
    bg: 'bg-green-100 dark:bg-green-900/50',
    text: 'text-green-800 dark:text-green-200',
    dot: 'bg-green-500',
  },
  greenLight: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    dot: 'bg-green-500',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/50',
    text: 'text-yellow-800 dark:text-yellow-200',
    dot: 'bg-yellow-500',
  },
  yellowLight: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
    dot: 'bg-yellow-500',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/50',
    text: 'text-red-800 dark:text-red-200',
    dot: 'bg-red-500',
  },
  redLight: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    dot: 'bg-red-500',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-800 dark:text-blue-200',
    dot: 'bg-blue-500',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/50',
    text: 'text-orange-800 dark:text-orange-200',
  },
  orangeLight: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-800 dark:text-orange-300',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-600',
    text: 'text-gray-800 dark:text-gray-200',
  },
  grayLight: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-800 dark:text-gray-300',
  },
} as const;

// Default color config for unknown statuses
const defaultStatusColor: StatusColorConfig = BASE_COLORS.gray;

// Allocation status colors (used in AllocationsPage, FailedAllocationsPage)
export const allocationStatusColors: Record<AllocationStatus, StatusColorConfig> = {
  running: BASE_COLORS.green,
  pending: BASE_COLORS.yellow,
  complete: BASE_COLORS.blue,
  failed: BASE_COLORS.red,
  lost: BASE_COLORS.red,
};

// Job status colors (used in JobList, StatusBadge)
export const jobStatusColors: Record<JobStatus, StatusColorConfig> = {
  running: BASE_COLORS.green,
  pending: BASE_COLORS.yellow,
  dead: BASE_COLORS.red,
  stopped: BASE_COLORS.gray,
  degraded: BASE_COLORS.orange,
};

// Node status colors (used in NodesPage)
export const nodeStatusColors: Record<NodeStatus, StatusColorConfig> = {
  ready: BASE_COLORS.green,
  down: BASE_COLORS.red,
  draining: BASE_COLORS.yellow,
};

// Server status colors (used in ServersPage)
export const serverStatusColors: Record<ServerStatus, StatusColorConfig> = {
  alive: BASE_COLORS.greenLight,
  failed: BASE_COLORS.redLight,
  left: BASE_COLORS.grayLight,
};

// Event severity colors (used in ActivityPage)
export const severityColors: Record<Severity, StatusColorConfig> = {
  info: BASE_COLORS.blue,
  warning: BASE_COLORS.yellow,
  error: BASE_COLORS.red,
};

// Cluster health status (used in ClusterHealth component)
export interface ClusterHealthConfig extends StatusColorConfig {
  pulse: boolean;
  label: string;
}

export const clusterHealthColors: Record<ClusterHealth, ClusterHealthConfig> = {
  healthy: {
    ...BASE_COLORS.greenLight,
    pulse: false,
    label: 'Cluster Healthy',
  },
  degraded: {
    ...BASE_COLORS.yellowLight,
    pulse: true,
    label: 'Cluster Degraded',
  },
  critical: {
    ...BASE_COLORS.redLight,
    pulse: true,
    label: 'Cluster Critical',
  },
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
      return BASE_COLORS.greenLight;
    case 'pending':
      return BASE_COLORS.yellowLight;
    case 'blocked':
      return BASE_COLORS.orangeLight;
    case 'failed':
    case 'canceled':
      return BASE_COLORS.redLight;
    default:
      return defaultStatusColor;
  }
}

// Version status colors (for job versions)
export function getVersionStatusColor(stable?: boolean): StatusColorConfig {
  return stable === true ? BASE_COLORS.greenLight : BASE_COLORS.grayLight;
}

// Node eligibility colors
export function getNodeEligibilityColor(eligible: string): StatusColorConfig {
  switch (eligible.toLowerCase()) {
    case 'eligible':
      return BASE_COLORS.greenLight;
    case 'ineligible':
      return BASE_COLORS.redLight;
    default:
      return defaultStatusColor;
  }
}

// Utility to combine bg and text classes
export function getStatusClasses(config: StatusColorConfig): string {
  return `${config.bg} ${config.text}`;
}
