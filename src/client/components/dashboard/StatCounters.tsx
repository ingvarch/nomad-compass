import { Link } from 'react-router-dom';
import { NomadJob, NomadNode, NomadNamespace } from '../../types/nomad';

interface StatCountersProps {
  jobs: NomadJob[];
  nodes: NomadNode[];
  namespaces: NomadNamespace[];
  activeFailedAllocations: number;
  loading?: boolean;
}

interface CounterCardProps {
  title: string;
  icon: React.ReactNode;
  stats: { label: string; value: number; color: string; link?: string }[];
  loading?: boolean;
}

function CounterCard({ title, icon, stats, loading }: CounterCardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  const total = stats.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-gray-500 dark:text-gray-400">{icon}</div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <span className="ml-auto text-2xl font-bold text-gray-900 dark:text-white">{total}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${stat.color}`} />
            {stat.link ? (
              <Link to={stat.link} className="hover:underline text-gray-600 dark:text-gray-300">
                {stat.value} {stat.label}
              </Link>
            ) : (
              <span className="text-gray-600 dark:text-gray-300">
                {stat.value} {stat.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function calculateJobStats(jobs: NomadJob[]) {
  let running = 0;
  let pending = 0;
  let dead = 0;

  jobs.forEach((job) => {
    switch (job.Status) {
      case 'running':
        running++;
        break;
      case 'pending':
        pending++;
        break;
      case 'dead':
        dead++;
        break;
    }
  });

  return { running, pending, dead };
}

function calculateNodeStats(nodes: NomadNode[]) {
  let ready = 0;
  let down = 0;
  let draining = 0;

  nodes.forEach((node) => {
    if (node.Drain) {
      draining++;
    } else if (node.Status === 'ready') {
      ready++;
    } else {
      down++;
    }
  });

  return { ready, down, draining };
}

function calculateAllocationStats(jobs: NomadJob[]) {
  let running = 0;
  let pending = 0;
  let failed = 0;

  jobs.forEach((job) => {
    if (job.JobSummary?.Summary) {
      Object.values(job.JobSummary.Summary).forEach((summary) => {
        running += summary.Running;
        pending += summary.Starting;
        failed += summary.Failed;
      });
    }
  });

  return { running, pending, failed };
}

interface AllocationCounterCardProps {
  running: number;
  pending: number;
  activeFailed: number;
  historicalFailed: number;
  loading?: boolean;
}

function AllocationCounterCard({ running, pending, activeFailed, historicalFailed, loading }: AllocationCounterCardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  const total = running + pending + activeFailed;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-gray-500 dark:text-gray-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Allocations</h3>
        <span className="ml-auto text-2xl font-bold text-gray-900 dark:text-white">{total}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-600 dark:text-gray-300">{running} Running</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-gray-600 dark:text-gray-300">{pending} Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <Link to="/allocations/failed" className="hover:underline text-gray-600 dark:text-gray-300">
            {activeFailed} Failed
            {historicalFailed > 0 && (
              <span className="text-gray-400 dark:text-gray-500 ml-1">
                ({historicalFailed} historical)
              </span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function StatCounters({ jobs, nodes, namespaces, activeFailedAllocations, loading }: StatCountersProps) {
  const jobStats = calculateJobStats(jobs);
  const nodeStats = calculateNodeStats(nodes);
  const allocStats = calculateAllocationStats(jobs);

  // Historical failures from JobSummary (for info only)
  const historicalFailed = allocStats.failed;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <CounterCard
        title="Jobs"
        loading={loading}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        }
        stats={[
          { label: 'Running', value: jobStats.running, color: 'bg-green-500', link: '/jobs?status=running' },
          { label: 'Pending', value: jobStats.pending, color: 'bg-yellow-500', link: '/jobs?status=pending' },
          { label: 'Dead', value: jobStats.dead, color: 'bg-gray-400', link: '/jobs?status=dead' },
        ]}
      />

      <CounterCard
        title="Nodes"
        loading={loading}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
        }
        stats={[
          { label: 'Ready', value: nodeStats.ready, color: 'bg-green-500' },
          { label: 'Down', value: nodeStats.down, color: 'bg-red-500' },
          { label: 'Draining', value: nodeStats.draining, color: 'bg-yellow-500' },
        ]}
      />

      <AllocationCounterCard
        loading={loading}
        running={allocStats.running}
        pending={allocStats.pending}
        activeFailed={activeFailedAllocations}
        historicalFailed={historicalFailed}
      />

      <CounterCard
        title="Namespaces"
        loading={loading}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        }
        stats={[{ label: 'Total', value: namespaces.length, color: 'bg-blue-500' }]}
      />
    </div>
  );
}
