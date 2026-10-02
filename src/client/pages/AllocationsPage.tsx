import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import type { NomadAllocation, NomadJobListStub } from '../types/nomad';
import { useFetch } from '../hooks/useFetch';
import { useFilteredData } from '../hooks/useFilteredData';
import {
  LoadingSpinner,
  ErrorAlert,
  PageHeader,
  RefreshButton,
  FilterButtons,
  DataTable,
  Badge,
  type Column,
} from '../components/ui';
import { formatTimestamp } from '../lib/utils/dateFormatter';
import { jobPath } from '../lib/utils/jobPath';
import { AllocationActionsDropdown, AllocationStatusBadge } from '../components/allocations';

type StatusFilter = 'all' | 'running' | 'pending' | 'complete' | 'failed';

interface AllocationsData {
  allocations: NomadAllocation[];
  jobs: Map<string, NomadJobListStub>;
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
  const jobs = useMemo(() => data?.jobs || new Map<string, NomadJobListStub>(), [data]);

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
            to={jobPath(alloc.JobID, alloc.Namespace)}
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
      render: (alloc) => <AllocationStatusBadge allocation={alloc} />,
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
      render: (alloc) => (
        <AllocationActionsDropdown allocation={alloc} onSuccess={refetch} />
      ),
    },
  ], [jobs, refetch]);

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
        mobileCardRenderer={(alloc) => {
          const job = jobs.get(alloc.JobID);

          return (
            <div className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {alloc.TaskGroup}
                    </span>
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                      ({alloc.ID.slice(0, 8)})
                    </span>
                  </div>
                  <div className="mt-0.5">
                    <Link
                      to={jobPath(alloc.JobID, alloc.Namespace)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {job?.Name || alloc.JobID}
                    </Link>
                  </div>
                </div>

                <AllocationStatusBadge allocation={alloc} />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Badge variant="blue">{alloc.Namespace}</Badge>
                  <span>{alloc.NodeName || alloc.NodeID?.slice(0, 8) || '-'}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span>{formatTimestamp(alloc.CreateTime)}</span>
                  <AllocationActionsDropdown allocation={alloc} onSuccess={refetch} />
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
