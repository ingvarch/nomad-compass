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
  Select,
  type Column,
} from '../components/ui';
import { Search, X, SlidersHorizontal, ChevronDown, RotateCcw } from 'lucide-react';
import { extractRecentEvents, formatTimeAgo, type RecentEvent } from '../lib/services/allocationAnalyzer';
import { severityColors, getStatusClasses } from '../lib/utils/statusColors';
import { labelSmallStyles } from '../lib/styles';
import { jobPath } from '../lib/utils/jobPath';

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
  const [showFilters, setShowFilters] = useState(false);

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
          to={jobPath(event.jobId, event.namespace)}
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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (namespaceFilter !== '*') count++;
    if (severityFilter !== 'all') count++;
    if (timeRangeFilter !== 'all') count++;
    if (eventTypeFilter !== 'all') count++;
    return count;
  }, [namespaceFilter, severityFilter, timeRangeFilter, eventTypeFilter]);

  const handleResetFilters = () => {
    setNamespaceFilter('*');
    setSeverityFilter('all');
    setTimeRangeFilter('all');
    setEventTypeFilter('all');
  };

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
        actions={<RefreshButton iconOnly onClick={refetch} />}
      />

      {error && <ErrorAlert message={error} />}

      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        {/* Always visible Search bar + Filters toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search job, task, or message..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-label="Toggle filters"
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all cursor-pointer select-none shrink-0 ${
              showFilters || activeFiltersCount > 0
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span
                data-testid="active-filters-badge"
                className="inline-flex items-center justify-center px-1.5 py-0.2 text-[11px] font-semibold rounded-full bg-blue-600 text-white min-w-[18px] h-[18px]"
              >
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                showFilters ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Collapsible Advanced Filters Section */}
        <div
          data-testid="activity-filters-panel"
          className={`grid transition-[grid-template-rows,opacity] duration-250 ease-in-out ${
            showFilters
              ? 'grid-rows-[1fr] opacity-100 mt-4'
              : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className={`min-h-0 ${showFilters ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-4">
              {/* Secondary Selects Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Namespace */}
                <Select
                  label="Namespace"
                  value={namespaceFilter}
                  onChange={setNamespaceFilter}
                  options={[
                    { value: '*', label: 'All Namespaces' },
                    ...namespaces.map((ns) => ({ value: ns.Name, label: ns.Name })),
                  ]}
                />

                {/* Severity */}
                <Select
                  label="Severity"
                  value={severityFilter}
                  onChange={(val) => setSeverityFilter(val as SeverityFilter)}
                  options={[
                    { value: 'all', label: 'All Severities' },
                    { value: 'error', label: 'Error' },
                    { value: 'warning', label: 'Warning' },
                    { value: 'info', label: 'Info' },
                  ]}
                />

                {/* Time Range */}
                <Select
                  label="Time Range"
                  value={timeRangeFilter}
                  onChange={(val) => setTimeRangeFilter(val as TimeRangeFilter)}
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: '1h', label: 'Last Hour' },
                    { value: '6h', label: 'Last 6 Hours' },
                    { value: '24h', label: 'Last 24 Hours' },
                    { value: '7d', label: 'Last 7 Days' },
                  ]}
                />
              </div>

              {/* Event Type Filter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelSmallStyles}>Event Type</label>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset filters
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEventTypeFilter('all')}
                    className={`px-3 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                      eventTypeFilter === 'all'
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All Types
                  </button>
                  {eventTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEventTypeFilter(type)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                        eventTypeFilter === type
                          ? 'bg-blue-600 text-white font-medium shadow-xs'
                          : 'bg-gray-100 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        items={filteredEvents}
        columns={columns}
        keyExtractor={(event, idx) => `${event.allocId}-${event.timestamp}-${idx}`}
        emptyState={{ message: 'No events match the current filters.' }}
        mobileCardRenderer={(event) => (
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${severityColors[event.severity].dot}`}
                  title={event.severity}
                />
                <Link
                  to={jobPath(event.jobId, event.namespace)}
                  className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate"
                >
                  {event.jobId}
                </Link>
                {event.taskName && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    / {event.taskName}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                {formatTimeAgo(event.timestamp)}
              </span>
            </div>

            <div className="flex items-start gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${getStatusClasses(severityColors[event.severity])}`}>
                {event.type}
              </span>
              <span className="text-xs text-gray-700 dark:text-gray-300 break-words flex-1">
                {event.message}
              </span>
            </div>
          </div>
        )}
      />

      <BackLink to="/dashboard" />
    </div>
  );
}
