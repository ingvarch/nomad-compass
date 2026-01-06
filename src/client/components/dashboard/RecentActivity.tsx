import { Link } from 'react-router-dom';
import type { RecentEvent } from '../../lib/services/allocationAnalyzer';
import { formatTimeAgo } from '../../lib/services/allocationAnalyzer';
import { severityColors, getStatusClasses } from '../../lib/utils/statusColors';

// Re-export RecentEvent type for other modules
export type { RecentEvent };

interface RecentActivityProps {
  events: RecentEvent[];
  loading?: boolean;
}

export function RecentActivity({ events, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Activity</h3>
        <Link
          to="/activity"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No recent events
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto">
          {events.map((event, idx) => (
            <div
              key={`${event.allocId}-${event.timestamp}-${idx}`}
              className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${severityColors[event.severity].dot}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <Link
                      to={`/jobs/${event.jobId}?namespace=${event.namespace}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                    >
                      {event.jobId}
                    </Link>
                    <span className="text-gray-400 dark:text-gray-500">{event.taskName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusClasses(severityColors[event.severity])}`}>
                      {event.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                    {event.message}
                  </p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {formatTimeAgo(event.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
