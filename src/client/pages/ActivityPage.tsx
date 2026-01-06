import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { NomadAllocation, NomadNamespace } from '../types/nomad';
import { LoadingSpinner } from '../components/ui';
import { extractRecentEvents, formatTimeAgo, RecentEvent } from '../lib/services/allocationAnalyzer';

type SeverityFilter = 'all' | 'info' | 'warning' | 'error';
type TimeRangeFilter = 'all' | '1h' | '6h' | '24h' | '7d';

const severityColors: Record<RecentEvent['severity'], string> = {
  info: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  warning: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
  error: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
};

const severityDots: Record<RecentEvent['severity'], string> = {
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

const timeRangeMs: Record<TimeRangeFilter, number> = {
  all: Infinity,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

export default function ActivityPage() {
  const [allocations, setAllocations] = useState<NomadAllocation[]>([]);
  const [namespaces, setNamespaces] = useState<NomadNamespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [namespaceFilter, setNamespaceFilter] = useState<string>('*');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    const client = createNomadClient();

    try {
      const [allocationsData, namespacesData] = await Promise.all([
        client.getAllocations(),
        client.getNamespaces(),
      ]);

      setAllocations(allocationsData);
      setNamespaces(namespacesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract all events (no limit)
  const allEvents = useMemo(
    () => extractRecentEvents(allocations, Infinity),
    [allocations]
  );

  // Get unique event types for filter
  const eventTypes = useMemo(() => {
    const types = new Set(allEvents.map((e) => e.type));
    return Array.from(types).sort();
  }, [allEvents]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    const now = Date.now();

    return allEvents.filter((event) => {
      // Namespace filter
      if (namespaceFilter !== '*' && event.namespace !== namespaceFilter) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'all' && event.severity !== severityFilter) {
        return false;
      }

      // Event type filter
      if (eventTypeFilter !== 'all' && event.type !== eventTypeFilter) {
        return false;
      }

      // Time range filter
      if (timeRangeFilter !== 'all') {
        const eventTimeMs = event.timestamp / 1_000_000; // Nomad uses nanoseconds
        const age = now - eventTimeMs;
        if (age > timeRangeMs[timeRangeFilter]) {
          return false;
        }
      }

      // Search query (job ID, task name, message)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          event.jobId.toLowerCase().includes(query) ||
          event.taskName.toLowerCase().includes(query) ||
          event.message.toLowerCase().includes(query);
        if (!matches) {
          return false;
        }
      }

      return true;
    });
  }, [allEvents, namespaceFilter, severityFilter, eventTypeFilter, timeRangeFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredEvents.length;
    const info = filteredEvents.filter((e) => e.severity === 'info').length;
    const warning = filteredEvents.filter((e) => e.severity === 'warning').length;
    const errorCount = filteredEvents.filter((e) => e.severity === 'error').length;
    return { total, info, warning, error: errorCount };
  }, [filteredEvents]);

  const selectClasses =
    'block w-full pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Activity</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View all cluster events and activity
          </p>
        </div>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Activity</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {stats.total} event{stats.total !== 1 ? 's' : ''} found
            {stats.error > 0 && (
              <span className="ml-2 text-red-600 dark:text-red-400">
                ({stats.error} error{stats.error !== 1 ? 's' : ''})
              </span>
            )}
            {stats.warning > 0 && (
              <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                ({stats.warning} warning{stats.warning !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Job, task, or message..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Namespace */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Namespace
            </label>
            <select
              value={namespaceFilter}
              onChange={(e) => setNamespaceFilter(e.target.value)}
              className={selectClasses}
            >
              <option value="*">All Namespaces</option>
              {namespaces.map((ns) => (
                <option key={ns.Name} value={ns.Name}>
                  {ns.Name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Severity
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              className={selectClasses}
            >
              <option value="all">All Severities</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Time Range
            </label>
            <select
              value={timeRangeFilter}
              onChange={(e) => setTimeRangeFilter(e.target.value as TimeRangeFilter)}
              className={selectClasses}
            >
              <option value="all">All Time</option>
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>

        {/* Event Type Filter (second row) */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Event Type
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEventTypeFilter('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                eventTypeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All Types
            </button>
            {eventTypes.map((type) => (
              <button
                key={type}
                onClick={() => setEventTypeFilter(type)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  eventTypeFilter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No events match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Job
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Task
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Namespace
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEvents.map((event, idx) => (
                  <tr
                    key={`${event.allocId}-${event.timestamp}-${idx}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`w-2 h-2 rounded-full inline-block ${severityDots[event.severity]}`}
                        title={event.severity}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(event.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        to={`/jobs/${event.jobId}?namespace=${event.namespace}`}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {event.jobId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {event.taskName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs ${severityColors[event.severity]}`}>
                        {event.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">
                      {event.message}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {event.namespace}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Link
        to="/dashboard"
        className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>
    </div>
  );
}
