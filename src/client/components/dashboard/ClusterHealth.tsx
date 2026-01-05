import { NomadAgentSelf, NomadAgentMembers, NomadNode } from '../../types/nomad';

type HealthStatus = 'healthy' | 'degraded' | 'critical';

interface ClusterHealthProps {
  agentSelf: NomadAgentSelf | null;
  agentMembers: NomadAgentMembers | null;
  nodes: NomadNode[];
  activeFailedAllocations: number;
  loading?: boolean;
}

function getHealthStatus(nodes: NomadNode[], activeFailedAllocations: number): HealthStatus {
  const downNodes = nodes.filter((n) => n.Status === 'down');
  const drainingNodes = nodes.filter((n) => n.Drain);

  // Critical: down nodes or high percentage of active failures
  if (downNodes.length > 0) {
    return 'critical';
  }

  // Degraded: draining nodes or any ACTIVE failed allocations
  // (not historical counters from JobSummary)
  if (drainingNodes.length > 0 || activeFailedAllocations > 0) {
    return 'degraded';
  }

  return 'healthy';
}

function getLeaderName(members: NomadAgentMembers | null): string | null {
  if (!members?.Members) return null;
  const leader = members.Members.find((m) => m.Leader);
  return leader?.Name || null;
}

const statusConfig: Record<HealthStatus, { color: string; bgColor: string; text: string; pulse: boolean }> = {
  healthy: {
    color: 'bg-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    text: 'Cluster Healthy',
    pulse: false,
  },
  degraded: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'Cluster Degraded',
    pulse: true,
  },
  critical: {
    color: 'bg-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    text: 'Cluster Critical',
    pulse: true,
  },
};

export function ClusterHealth({ agentSelf, agentMembers, nodes, activeFailedAllocations, loading }: ClusterHealthProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-60" />
          </div>
        </div>
      </div>
    );
  }

  const status = getHealthStatus(nodes, activeFailedAllocations);
  const config = statusConfig[status];
  const leader = getLeaderName(agentMembers);
  const version = agentSelf?.config?.Version?.Version;
  const region = agentSelf?.config?.Region;

  return (
    <div className={`rounded-lg shadow p-4 ${config.bgColor}`}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className={`w-12 h-12 ${config.color} rounded-full flex items-center justify-center`}>
            {status === 'healthy' && (
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'degraded' && (
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            {status === 'critical' && (
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          {config.pulse && (
            <div className={`absolute inset-0 w-12 h-12 ${config.color} rounded-full animate-ping opacity-25`} />
          )}
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{config.text}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
            {leader && <span>Leader: {leader}</span>}
            {version && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                v{version}
              </span>
            )}
            {region && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                {region}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
