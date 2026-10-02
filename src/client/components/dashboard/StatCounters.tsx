import React from 'react';
import { Link } from 'react-router-dom';
import { NomadJobListStub, NomadNode, NomadNamespace } from '../../types/nomad';
import { countJobsByStatus } from '../../lib/services/jobCounts';

interface StatCountersProps {
  jobs: NomadJobListStub[];
  nodes: NomadNode[];
  namespaces: NomadNamespace[];
  activeFailedAllocations: number;
  loading?: boolean;
}

interface StatItem {
  label: string;
  value: number;
  color: string;
  link?: string;
  detail?: string;
}

interface CounterCardProps {
  title: string;
  titleLink?: string;
  icon: React.ReactNode;
  stats: StatItem[];
  total?: number;
  loading?: boolean;
}

function CounterCard({ title, titleLink, icon, stats, total: explicitTotal, loading }: CounterCardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-100 dark:border-gray-700/50 p-3.5 sm:p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
        <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-10 my-2" />
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 space-y-1.5">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  const total = explicitTotal !== undefined ? explicitTotal : stats.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-100 dark:border-gray-700/50 p-3.5 sm:p-4 flex flex-col justify-between">
      <div>
        {/* Card Header: Icon + Title with navigation chevron */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-gray-500 dark:text-gray-400 shrink-0">{icon}</div>
            {titleLink ? (
              <Link
                to={titleLink}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group truncate"
              >
                <span className="truncate">{title}</span>
                <svg
                  className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{title}</h3>
            )}
          </div>
        </div>

        {/* Large Prominent Counter */}
        <div className="mt-1.5 mb-2.5">
          <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {total}
          </span>
        </div>
      </div>

      {/* Sub-stats breakdown */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex flex-col sm:flex-row sm:flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${stat.color}`} />
            {stat.link ? (
              <Link to={stat.link} className="hover:underline text-gray-600 dark:text-gray-300 truncate">
                <span>{stat.value} {stat.label}</span>
                {stat.detail && (
                  <span className="text-gray-400 dark:text-gray-500 ml-1 font-normal">
                    {stat.detail}
                  </span>
                )}
              </Link>
            ) : (
              <span className="text-gray-600 dark:text-gray-300 truncate">
                <span>{stat.value} {stat.label}</span>
                {stat.detail && (
                  <span className="text-gray-400 dark:text-gray-500 ml-1 font-normal">
                    {stat.detail}
                  </span>
                )}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
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

function calculateAllocationStats(jobs: NomadJobListStub[]) {
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

export function StatCounters({ jobs, nodes, namespaces, activeFailedAllocations, loading }: StatCountersProps) {
  const jobStats = countJobsByStatus(jobs);
  const nodeStats = calculateNodeStats(nodes);
  const allocStats = calculateAllocationStats(jobs);

  // Historical failures from JobSummary (for info only)
  const historicalFailed = allocStats.failed;
  const allocationsTotal = allocStats.running + allocStats.pending + activeFailedAllocations;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <CounterCard
        title="Jobs"
        titleLink="/jobs"
        loading={loading}
        icon={
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        titleLink="/nodes"
        loading={loading}
        icon={
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
        }
        stats={[
          { label: 'Ready', value: nodeStats.ready, color: 'bg-green-500', link: '/nodes?status=ready' },
          { label: 'Down', value: nodeStats.down, color: 'bg-red-500', link: '/nodes?status=down' },
          { label: 'Draining', value: nodeStats.draining, color: 'bg-yellow-500', link: '/nodes?status=draining' },
        ]}
      />

      <CounterCard
        title="Allocations"
        titleLink="/allocations"
        loading={loading}
        total={allocationsTotal}
        icon={
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
        }
        stats={[
          { label: 'Running', value: allocStats.running, color: 'bg-green-500', link: '/allocations?status=running' },
          { label: 'Pending', value: allocStats.pending, color: 'bg-yellow-500', link: '/allocations?status=pending' },
          {
            label: 'Failed',
            value: activeFailedAllocations,
            color: 'bg-red-500',
            link: '/allocations?status=failed',
            detail: historicalFailed > 0 ? `(${historicalFailed})` : undefined,
          },
        ]}
      />

      <CounterCard
        title="Namespaces"
        titleLink="/namespaces"
        loading={loading}
        icon={
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
