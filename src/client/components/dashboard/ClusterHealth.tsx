import { NomadAgentSelf, NomadAgentMembers, NomadNode } from '../../types/nomad';
import { ClusterHealth as ClusterHealthType } from '../../lib/utils/statusColors';
import { Badge } from '../ui';

interface ClusterHealthProps {
  agentSelf: NomadAgentSelf | null;
  agentMembers: NomadAgentMembers | null;
  nodes: NomadNode[];
  activeFailedAllocations: number;
  loading?: boolean;
}

function getHealthStatus(nodes: NomadNode[], activeFailedAllocations: number): ClusterHealthType {
  const downNodes = nodes.filter((n) => n.Status === 'down');
  const drainingNodes = nodes.filter((n) => n.Drain);

  // Critical: down nodes
  if (downNodes.length > 0) {
    return 'critical';
  }

  // Degraded: draining nodes or any ACTIVE failed allocations
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

export function ClusterHealth({
  agentSelf,
  agentMembers,
  nodes,
  activeFailedAllocations,
  loading,
}: ClusterHealthProps) {
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading cluster health"
        className="rounded-lg border border-gray-200/60 dark:border-gray-700/50 bg-white/60 dark:bg-gray-800/60 px-3.5 py-2.5 shadow-xs animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-14" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
        </div>
      </div>
    );
  }

  const status = getHealthStatus(nodes, activeFailedAllocations);
  const leader = getLeaderName(agentMembers);
  const version = agentSelf?.config?.Version?.Version;
  const region = agentSelf?.config?.Region;

  // Compact status theme inspired by Cloudflare Status
  const statusTheme = {
    healthy: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
      dot: 'bg-emerald-500',
      ping: 'bg-emerald-400',
      label: 'Cluster Healthy',
    },
    degraded: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500/20 dark:border-amber-500/30 text-amber-900 dark:text-amber-200',
      dot: 'bg-amber-500',
      ping: 'bg-amber-400',
      label: 'Cluster Degraded',
    },
    critical: {
      bg: 'bg-red-500/10 dark:bg-red-500/10 border-red-500/20 dark:border-red-500/30 text-red-900 dark:text-red-200',
      dot: 'bg-red-500',
      ping: 'bg-red-400',
      label: 'Cluster Critical',
    },
  }[status];

  return (
    <div
      role="status"
      aria-label={`Cluster status: ${statusTheme.label}`}
      className={`rounded-lg border px-3.5 py-2 shadow-xs transition-colors ${statusTheme.bg}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        {/* Left: Live pulsing dot + Status label */}
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusTheme.ping}`}
            />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusTheme.dot}`} />
          </span>
          <span className="font-medium text-xs sm:text-sm tracking-tight text-gray-900 dark:text-white">
            {statusTheme.label}
          </span>
        </div>

        {/* Right: Metadata pills (version, region, leader) */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {leader && (
            <span className="text-gray-600 dark:text-gray-300 text-xs truncate max-w-[150px] sm:max-w-none">
              Leader: <span className="font-mono">{leader}</span>
            </span>
          )}
          {version && (
            <Badge variant="gray" className="font-mono text-[11px] py-0.5 px-2">
              v{version}
            </Badge>
          )}
          {region && (
            <Badge variant="blue" className="text-[11px] py-0.5 px-2">
              {region}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
