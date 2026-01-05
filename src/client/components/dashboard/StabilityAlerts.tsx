import { Link } from 'react-router-dom';
import type { ProblematicAllocation } from '../../lib/services/allocationAnalyzer';
import { formatTimeAgo } from '../../lib/services/allocationAnalyzer';

interface StabilityAlertsProps {
  problems: ProblematicAllocation[];
  loading?: boolean;
}

export function StabilityAlerts({ problems, loading }: StabilityAlertsProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36 mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const criticalCount = problems.filter((p) => p.severity === 'critical').length;
  const warningCount = problems.filter((p) => p.severity === 'warning').length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-500 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Stability Alerts</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              {warningCount} warning
            </span>
          )}
        </div>
      </div>

      {problems.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <svg
            className="mx-auto h-10 w-10 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">All allocations are stable</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto">
          {problems.slice(0, 5).map(({ allocation, issues, severity }) => (
            <div
              key={allocation.ID}
              className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                    />
                    <Link
                      to={`/jobs/${allocation.JobID}?namespace=${allocation.Namespace}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                    >
                      {allocation.JobID}
                    </Link>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                      {allocation.ID.slice(0, 8)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {issues.map((issue, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          issue.type === 'oom_killed' || issue.type === 'crash_loop'
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                            : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
                        }`}
                      >
                        {issue.taskName}: {issue.details}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 text-right">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {allocation.NodeName}
                  </span>
                  {issues[0]?.timestamp && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTimeAgo(issues[0].timestamp)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {problems.length > 5 && (
        <Link
          to="/jobs?status=failed"
          className="block px-4 py-2 text-sm text-center text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700"
        >
          View all {problems.length} alerts
        </Link>
      )}
    </div>
  );
}
