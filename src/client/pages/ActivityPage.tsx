import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { NomadAllocation, NomadNamespace } from '../types/nomad';
import { useFetch } from '../hooks/useFetch';
import {
  LoadingSpinner,
  ErrorAlert,
  PageHeader,
  RefreshButton,
  BackLink,
  DataTable,
  type Column,
} from '../components/ui';
import { extractRecentEvents, formatTimeAgo, type RecentEvent } from '../lib/services/allocationAnalyzer';
import { severityColors, getStatusClasses } from '../lib/utils/statusColors';
import { labelSmallStyles } from '../lib/styles';

type SeverityFilter = 'all' | 'info' | 'warning' | 'error';
type TimeRangeFilter = 'all' | '1h' | '6h' | '24h' | '7d';

const timeRangeMs: Record<TimeRangeFilter, number> = {
  all: Infinity,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

interface ActivityData {
  allocations: NomadAllocation[];
  namespaces: NomadNamespace[];
}

export default function ActivityPage() {
  // Filters
  const [namespaceFilter, setNamespaceFilter] = useState<string>('*');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  const { data, loading, error, refetch } = useFetch(
    async (): Promise<ActivityData> => {
      const client = createNomadClient();
      const [allocationsData, namespacesData] = await Promise.all([
        client.getAllocations(),
        client.getNamespaces(),
      ]);
      return {
        allocations: allocationsData,
        namespaces: namespacesData,
      };
    },
    [],
    { initialData: { allocations: [], namespaces: [] }, errorMessage: 'Failed to fetch activity data' }
  );

  const allocations = useMemo(() => data?.allocations || [], [data]);
  const namespaces = useMemo(() => data?.namespaces || [], [data]);

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

  const columns: Column<RecentEvent>[] = useMemo(() => [
    {
      key: 'severity',
      header: '',
      render: (event) => (
        <span
          className={`w-2 h-2 rounded-full inline-block ${severityColors[event.severity].dot}`}
          title={event.severity}
        />
      ),
    },
    {
      key: 'time',
      header: 'Time',
      render: (event) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatTimeAgo(event.timestamp)}
        </span>
      ),
    },
    {
      key: 'job',
      header: 'Job',
      render: (event) => (
        <Link
          to={`/jobs/${event.jobId}?namespace=${event.namespace}`}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          {event.jobId}
        </Link>
      ),
    },
    {
      key: 'task',
      header: 'Task',
      render: (event) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{event.taskName}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (event) => (
        <span className={`px-2 py-0.5 rounded text-xs ${getStatusClasses(severityColors[event.severity])}`}>
          {event.type}
        </span>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (event) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 max-w-md truncate block">
          {event.message}
        </span>
      ),
    },
    {
      key: 'namespace',
      header: 'Namespace',
      render: (event) => (
        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
          {event.namespace}
        </span>
      ),
    },
  ], []);

  const selectClasses =
    'block w-full pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Activity"
          description="View all cluster events and activity"
        />
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Activity"
        description={
          <>
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
          </>
        }
        actions={<RefreshButton onClick={refetch} />}
      />

      {error && <ErrorAlert message={error} />}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className={labelSmallStyles}>
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
            <label className={labelSmallStyles}>
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
            <label className={labelSmallStyles}>
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
            <label className={labelSmallStyles}>
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
          <label className={labelSmallStyles}>
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

      <DataTable
        items={filteredEvents}
        columns={columns}
        keyExtractor={(event, idx) => `${event.allocId}-${event.timestamp}-${idx}`}
        emptyState={{ message: 'No events match the current filters.' }}
      />

      <BackLink to="/dashboard" />
    </div>
  );
}
