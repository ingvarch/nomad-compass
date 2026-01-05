import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { NomadNamespace, NomadJob } from '../types/nomad';

interface NamespaceInfo {
  namespace: NomadNamespace;
  jobCount: number;
  runningJobs: number;
}

export default function NamespacesPage() {
  const [namespaces, setNamespaces] = useState<NamespaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const client = createNomadClient();

    try {
      const [namespacesData, jobsResponse] = await Promise.all([
        client.getNamespaces(),
        client.getJobs(),
      ]);

      const jobs = jobsResponse.Jobs || [];

      // Count jobs per namespace
      const jobCountByNamespace = new Map<string, { total: number; running: number }>();
      jobs.forEach((job: NomadJob) => {
        const ns = job.Namespace;
        const current = jobCountByNamespace.get(ns) || { total: 0, running: 0 };
        current.total++;
        if (job.Status === 'running') current.running++;
        jobCountByNamespace.set(ns, current);
      });

      const namespacesWithCounts = namespacesData.map((ns) => ({
        namespace: ns,
        jobCount: jobCountByNamespace.get(ns.Name)?.total || 0,
        runningJobs: jobCountByNamespace.get(ns.Name)?.running || 0,
      }));

      // Sort by job count descending, then by name
      namespacesWithCounts.sort((a, b) => {
        if (b.jobCount !== a.jobCount) return b.jobCount - a.jobCount;
        return a.namespace.Name.localeCompare(b.namespace.Name);
      });

      setNamespaces(namespacesWithCounts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch namespaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Namespaces</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View cluster namespaces and their jobs
          </p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const totalJobs = namespaces.reduce((sum, ns) => sum + ns.jobCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Namespaces</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {namespaces.length} namespace{namespaces.length !== 1 ? 's' : ''} with {totalJobs} total job{totalJobs !== 1 ? 's' : ''}
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

      {/* Namespaces Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {namespaces.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No namespaces found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Jobs</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Running</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {namespaces.map(({ namespace, jobCount, runningJobs }) => (
                  <tr key={namespace.Name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        to={`/jobs?namespace=${namespace.Name}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        {namespace.Name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {namespace.Description || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {jobCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {runningJobs > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{runningJobs}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">0</span>
                      )}
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
