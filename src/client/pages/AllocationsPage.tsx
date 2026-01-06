import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { NomadAllocation, NomadJob } from '../types/nomad';
import { LoadingSpinner } from '../components/ui';

type StatusFilter = 'all' | 'running' | 'pending' | 'complete' | 'failed';

function formatTimestamp(nanoTimestamp: number): string {
  const date = new Date(nanoTimestamp / 1000000);
  return date.toLocaleString();
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'running':
      return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200';
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200';
    case 'complete':
      return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200';
    case 'failed':
    case 'lost':
      return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200';
    default:
      return 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200';
  }
}

export default function AllocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allocations, setAllocations] = useState<NomadAllocation[]>([]);
  const [jobs, setJobs] = useState<Map<string, NomadJob>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as StatusFilter) || 'all';

  const fetchData = useCallback(async () => {
    const client = createNomadClient();

    try {
      const [allocationsData, jobsResponse] = await Promise.all([
        client.getAllocations(),
        client.getJobs(),
      ]);

      const jobsMap = new Map((jobsResponse.Jobs || []).map((j) => [j.ID, j]));

      setAllocations(allocationsData);
      setJobs(jobsMap);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch allocations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAllocations = allocations.filter((alloc) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'failed') {
      return alloc.ClientStatus === 'failed' || alloc.ClientStatus === 'lost';
    }
    return alloc.ClientStatus === statusFilter;
  });

  const stats = {
    running: allocations.filter((a) => a.ClientStatus === 'running').length,
    pending: allocations.filter((a) => a.ClientStatus === 'pending').length,
    complete: allocations.filter((a) => a.ClientStatus === 'complete').length,
    failed: allocations.filter((a) => a.ClientStatus === 'failed' || a.ClientStatus === 'lost').length,
  };

  const setFilter = (filter: StatusFilter) => {
    if (filter === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', filter);
    }
    setSearchParams(searchParams);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Allocations</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View all cluster allocations
          </p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Allocations</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View all cluster allocations
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'All', count: allocations.length },
          { value: 'running', label: 'Running', count: stats.running, color: 'bg-green-500' },
          { value: 'pending', label: 'Pending', count: stats.pending, color: 'bg-yellow-500' },
          { value: 'complete', label: 'Complete', count: stats.complete, color: 'bg-blue-500' },
          { value: 'failed', label: 'Failed', count: stats.failed, color: 'bg-red-500' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilter(filter.value as StatusFilter)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              statusFilter === filter.value
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {filter.color && <span className={`w-2 h-2 rounded-full ${filter.color}`} />}
            {filter.label}
            <span className="text-gray-500 dark:text-gray-400">({filter.count})</span>
          </button>
        ))}
      </div>

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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAllocations.map((alloc) => {
                  const job = jobs.get(alloc.JobID);
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
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(alloc.ClientStatus)}`}>
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
                    </tr>
                  );
                })}
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
