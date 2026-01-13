import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import type { NomadAllocation, NomadJob } from '../types/nomad';
import { useFetch } from '../hooks/useFetch';
import { useFilteredData } from '../hooks/useFilteredData';
import {
  LoadingSpinner,
  ErrorAlert,
  PageHeader,
  RefreshButton,
  FilterButtons,
  BackLink,
  DataTable,
  Badge,
  type Column,
} from '../components/ui';
import { getAllocationStatusColor, getStatusClasses } from '../lib/utils/statusColors';
import { formatTimestamp } from '../lib/utils/dateFormatter';
import { Terminal } from 'lucide-react';

function getFirstTask(alloc: NomadAllocation): string | null {
  if (alloc.TaskStates) {
    const tasks = Object.keys(alloc.TaskStates);
    if (tasks.length > 0) return tasks[0];
  }
  return null;
}

type StatusFilter = 'all' | 'running' | 'pending' | 'complete' | 'failed';

interface AllocationsData {
  allocations: NomadAllocation[];
  jobs: Map<string, NomadJob>;
}

export default function AllocationsPage() {
  const { data, loading, error, refetch } = useFetch(
    async (): Promise<AllocationsData> => {
      const client = createNomadClient();
      const [allocationsData, jobsResponse] = await Promise.all([
        client.getAllocations(),
        client.getJobs(),
      ]);
      const jobsMap = new Map((jobsResponse.Jobs || []).map((j) => [j.ID, j]));
      return {
        allocations: allocationsData,
        jobs: jobsMap,
      };
    },
    [],
    { initialData: { allocations: [], jobs: new Map() }, errorMessage: 'Failed to fetch allocations' }
  );

  const allocations = useMemo(() => data?.allocations || [], [data]);
  const jobs = useMemo(() => data?.jobs || new Map<string, NomadJob>(), [data]);

  const { activeFilter, filteredItems, filterOptions, setFilter } = useFilteredData<NomadAllocation, StatusFilter>(
    allocations,
    {
      defaultValue: 'all',
      filters: [
        { value: 'all', label: 'All', predicate: () => true },
        { value: 'running', label: 'Running', predicate: (a) => a.ClientStatus === 'running', color: 'bg-green-500' },
        { value: 'pending', label: 'Pending', predicate: (a) => a.ClientStatus === 'pending', color: 'bg-yellow-500' },
        { value: 'complete', label: 'Complete', predicate: (a) => a.ClientStatus === 'complete', color: 'bg-blue-500' },
        { value: 'failed', label: 'Failed', predicate: (a) => a.ClientStatus === 'failed' || a.ClientStatus === 'lost', color: 'bg-red-500' },
      ],
    }
  );

  const columns: Column<NomadAllocation>[] = useMemo(() => [
    {
      key: 'id',
      header: 'ID',
      render: (alloc) => (
        <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
          {alloc.ID.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'job',
      header: 'Job',
      render: (alloc) => {
        const job = jobs.get(alloc.JobID);
        return (
          <Link
            to={`/jobs/${alloc.JobID}?namespace=${alloc.Namespace}`}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {job?.Name || alloc.JobID}
          </Link>
        );
      },
    },
    {
      key: 'taskGroup',
      header: 'Task Group',
      render: (alloc) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{alloc.TaskGroup}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (alloc) => {
        const statusColors = getAllocationStatusColor(alloc.ClientStatus);
        return (
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClasses(statusColors)}`}>
            {alloc.ClientStatus}
          </span>
        );
      },
    },
    {
      key: 'node',
      header: 'Node',
      render: (alloc) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {alloc.NodeName || alloc.NodeID?.slice(0, 8) || '-'}
        </span>
      ),
    },
    {
      key: 'namespace',
      header: 'Namespace',
      render: (alloc) => (
        <Badge variant="blue">{alloc.Namespace}</Badge>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (alloc) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatTimestamp(alloc.CreateTime)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      textAlign: 'right',
      render: (alloc) => {
        if (alloc.ClientStatus !== 'running') return null;
        const firstTask = getFirstTask(alloc);
        if (!firstTask) return null;
        return (
          <Link
            to={`/exec/${alloc.ID}/${firstTask}?namespace=${alloc.Namespace}`}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Open terminal"
            onClick={(e) => e.stopPropagation()}
          >
            <Terminal className="w-3.5 h-3.5" />
            Exec
          </Link>
        );
      },
    },
  ], [jobs]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Allocations" description="View all cluster allocations" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Allocations"
        description="View all cluster allocations"
        actions={<RefreshButton onClick={refetch} />}
      />

      {error && <ErrorAlert message={error} />}

      <FilterButtons
        options={filterOptions}
        activeValue={activeFilter}
        onFilterChange={setFilter}
      />

      <DataTable
        items={filteredItems}
        columns={columns}
        keyExtractor={(alloc) => alloc.ID}
        emptyState={{ message: 'No allocations found.' }}
      />

      <BackLink to="/dashboard" />
    </div>
  );
}
