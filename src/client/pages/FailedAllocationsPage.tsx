import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { NomadAllocation, NomadJob } from '../types/nomad';
import { LoadingSpinner, ErrorAlert } from '../components/ui';
import { useToast } from '../context/ToastContext';

interface FailedAllocationInfo {
  allocation: NomadAllocation;
  jobName: string;
  failedTasks: string[];
}

interface TaskGroupFailure {
  name: string;
  failed: number;
  lost: number;
}

interface HistoricalJobInfo {
  job: NomadJob;
  failedCount: number;
  taskGroups: TaskGroupFailure[];
}

function formatTimestamp(nanoTimestamp: number): string {
  const date = new Date(nanoTimestamp / 1000000);
  return date.toLocaleString();
}

function getFailedTasks(alloc: NomadAllocation): string[] {
  if (!alloc.TaskStates) return [];
  return Object.entries(alloc.TaskStates)
    .filter(([, task]) => task.Failed)
    .map(([name, task]) => {
      const lastEvent = task.Events?.[task.Events.length - 1];
      return `${name}: ${lastEvent?.DisplayMessage || lastEvent?.Message || 'Failed'}`;
    });
}

export default function FailedAllocationsPage() {
  const [activeFailures, setActiveFailures] = useState<FailedAllocationInfo[]>([]);
  const [historicalJobs, setHistoricalJobs] = useState<HistoricalJobInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gcLoading, setGcLoading] = useState(false);
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    const client = createNomadClient();

    try {
      // Fetch allocations and jobs in parallel
      const [allocations, jobsResponse] = await Promise.all([
        client.getAllocations(),
        client.getJobs(),
      ]);

      const jobs = jobsResponse.Jobs || [];
      const jobMap = new Map(jobs.map((j) => [j.ID, j]));

      // Find ACTIVE failed allocations (real objects)
      const activeFailed = allocations
        .filter((alloc) =>
          alloc.ClientStatus === 'failed' ||
          alloc.ClientStatus === 'lost' ||
          (alloc.TaskStates && Object.values(alloc.TaskStates).some((t) => t.Failed))
        )
        .map((alloc) => ({
          allocation: alloc,
          jobName: jobMap.get(alloc.JobID)?.Name || alloc.JobID,
          failedTasks: getFailedTasks(alloc),
        }));

      // Find jobs with HISTORICAL failures (from JobSummary, for info)
      const historical = jobs
        .filter((job) => {
          if (!job.JobSummary?.Summary) return false;
          const failedCount = Object.values(job.JobSummary.Summary).reduce(
            (sum, s) => sum + s.Failed + s.Lost, 0
          );
          return failedCount > 0;
        })
        .map((job) => {
          const taskGroups: TaskGroupFailure[] = Object.entries(job.JobSummary!.Summary)
            .filter(([, s]) => s.Failed > 0 || s.Lost > 0)
            .map(([name, s]) => ({
              name,
              failed: s.Failed,
              lost: s.Lost,
            }));

          return {
            job,
            failedCount: taskGroups.reduce((sum, tg) => sum + tg.failed + tg.lost, 0),
            taskGroups,
          };
        })
        .sort((a, b) => b.failedCount - a.failedCount);

      setActiveFailures(activeFailed);
      setHistoricalJobs(historical);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGarbageCollect = async () => {
    setGcLoading(true);
    const client = createNomadClient();

    try {
      await client.garbageCollect();
      addToast('Garbage collection triggered successfully', 'success');
      setLoading(true);
      await fetchData();
    } catch (err) {
      addToast(
        `Failed to trigger GC: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setGcLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Failed Allocations
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View active and historical allocation failures
          </p>
        </div>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const totalHistoricalCount = historicalJobs.reduce((sum, j) => sum + j.failedCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Failed Allocations
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View active and historical allocation failures
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={handleGarbageCollect}
            disabled={gcLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {gcLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Run GC
              </>
            )}
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Active Failures Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${activeFailures.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Active Failures
            </h2>
            <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
              {activeFailures.length} allocation{activeFailures.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {activeFailures.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No active failures</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              All allocations are running normally.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Job</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Allocation</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Node</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {activeFailures.map(({ allocation, jobName, failedTasks }) => (
                  <tr key={allocation.ID} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Link
                        to={`/jobs/${allocation.JobID}?namespace=${allocation.Namespace}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {jobName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {allocation.ID.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200">
                        {allocation.ClientStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {allocation.NodeName || allocation.NodeID?.slice(0, 8) || '-'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatTimestamp(allocation.ModifyTime)}
                    </td>
                    <td className="px-4 py-2 max-w-xs">
                      <span className="text-sm text-red-600 dark:text-red-400 truncate block">
                        {failedTasks.length > 0 ? failedTasks.join(', ') : allocation.ClientDescription || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Failures Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-400" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Historical Failures
            </h2>
            <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
              {totalHistoricalCount} total across {historicalJobs.length} job{historicalJobs.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            These are cumulative counters from job history. They don't affect cluster health status and reset when jobs are redeployed.
          </p>
        </div>

        {historicalJobs.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No historical failures recorded.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {historicalJobs.map(({ job, failedCount, taskGroups }) => (
              <div key={`${job.Namespace}/${job.ID}`} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      to={`/jobs/${job.ID}?namespace=${job.Namespace}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {job.Name}
                    </Link>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200">
                      {job.Type}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                      {job.Namespace}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      job.Status === 'running'
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                    }`}>
                      {job.Status}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {failedCount}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {taskGroups.map((tg) => (
                    <span key={tg.name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                      <span className="font-medium">{tg.name}:</span>
                      {tg.failed > 0 && <span>{tg.failed} failed</span>}
                      {tg.failed > 0 && tg.lost > 0 && <span>,</span>}
                      {tg.lost > 0 && <span>{tg.lost} lost</span>}
                    </span>
                  ))}
                  <span className="text-gray-400 dark:text-gray-500">
                    Last updated: {formatTimestamp(job.SubmitTime)}
                  </span>
                </div>
              </div>
            ))}
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
