import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { NomadAllocation, NomadJob } from '../types/nomad';
import { useFetch } from '../hooks/useFetch';
import {
  LoadingSpinner,
  ErrorAlert,
  PageHeader,
  RefreshButton,
  FilterButtons,
  BackLink,
  FilterOption,
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
  const [searchParams, setSearchParams] = useSearchParams();

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

  const statusFilter = (searchParams.get('status') as StatusFilter) || 'all';

  const filteredAllocations = allocations.filter((alloc) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'failed') {
      return alloc.ClientStatus === 'failed' || alloc.ClientStatus === 'lost';
    }
    return alloc.ClientStatus === statusFilter;
  });

  const stats = useMemo(() => ({
    running: allocations.filter((a) => a.ClientStatus === 'running').length,
    pending: allocations.filter((a) => a.ClientStatus === 'pending').length,
    complete: allocations.filter((a) => a.ClientStatus === 'complete').length,
    failed: allocations.filter((a) => a.ClientStatus === 'failed' || a.ClientStatus === 'lost').length,
  }), [allocations]);

  const setFilter = (filter: string) => {
    if (filter === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', filter);
    }
    setSearchParams(searchParams);
  };

  const filterOptions: FilterOption[] = [
    { value: 'all', label: 'All', count: allocations.length },
    { value: 'running', label: 'Running', count: stats.running, color: 'bg-green-500' },
    { value: 'pending', label: 'Pending', count: stats.pending, color: 'bg-yellow-500' },
    { value: 'complete', label: 'Complete', count: stats.complete, color: 'bg-blue-500' },
    { value: 'failed', label: 'Failed', count: stats.failed, color: 'bg-red-500' },
  ];

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

      {/* Status Filter */}
      <FilterButtons
        options={filterOptions}
        activeValue={statusFilter}
        onFilterChange={setFilter}
      />

      {/* Allocations Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {filteredAllocations.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No allocations found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Job</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Task Group</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Node</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Namespace</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAllocations.map((alloc) => {
                  const job = jobs.get(alloc.JobID);
                  const statusColors = getAllocationStatusColor(alloc.ClientStatus);
                  return (
                    <tr key={alloc.ID} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                          {alloc.ID.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          to={`/jobs/${alloc.JobID}?namespace=${alloc.Namespace}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {job?.Name || alloc.JobID}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {alloc.TaskGroup}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClasses(statusColors)}`}>
                          {alloc.ClientStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {alloc.NodeName || alloc.NodeID?.slice(0, 8) || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                          {alloc.Namespace}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatTimestamp(alloc.CreateTime)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {alloc.ClientStatus === 'running' && getFirstTask(alloc) && (
                          <Link
                            to={`/exec/${alloc.ID}/${getFirstTask(alloc)}?namespace=${alloc.Namespace}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                            title="Open terminal"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            Exec
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BackLink to="/dashboard" />
    </div>
  );
}
