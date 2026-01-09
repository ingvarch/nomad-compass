import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createNomadClient } from '../../lib/api/nomad';
import { NomadJob, NomadNamespace } from '../../types/nomad';
import { LoadingSpinner, ErrorAlert } from '../ui';
import { StatusBadge } from './detail/StatusBadge';

export const JobList: React.FC = () => {
  const [jobs, setJobs] = useState<NomadJob[]>([]);
  const [namespaces, setNamespaces] = useState<NomadNamespace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get namespace from URL or default to '*'
  const selectedNamespace = searchParams.get('namespace') || '*';

  // Fetch namespaces and jobs
  useEffect(() => {
    const fetchNamespacesAndJobs = async () => {
      if (!isAuthenticated) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      try {
        const client = createNomadClient();

        // Fetch namespaces first
        const nsResponse = await client.getNamespaces();
        const sortedNamespaces = [
          { Name: '*', Description: 'All Namespaces' },
          ...nsResponse.sort((a, b) => a.Name.localeCompare(b.Name))
        ];
        setNamespaces(sortedNamespaces);

        // Fetch jobs
        const jobsResponse = await client.getJobs(selectedNamespace);
        setJobs(jobsResponse.Jobs || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch namespaces or jobs:', err);
        setError('Failed to load namespaces or jobs. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNamespacesAndJobs();
  }, [isAuthenticated, selectedNamespace]);

  // Handle namespace change - update URL
  const handleNamespaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '*') {
      // Remove namespace param for "All Namespaces"
      searchParams.delete('namespace');
    } else {
      searchParams.set('namespace', value);
    }
    setSearchParams(searchParams);
  };

  // Render loading state
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
    );
  }

  // Render error state
  if (error) {
    return <ErrorAlert message={error} showTitle />;
  }

  return (
      <div>
        {/* Namespace Filter */}
        <div className="mb-4 flex items-center space-x-4">
          <label htmlFor="namespace-select" className="text-sm font-medium text-gray-700 dark:text-monokai-text">
            Namespace:
          </label>
          <select
              id="namespace-select"
              value={selectedNamespace}
              onChange={handleNamespaceChange}
              className="block w-auto pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md dark:bg-monokai-surface dark:border-monokai-muted dark:text-monokai-text dark:focus:ring-monokai-blue dark:focus:border-monokai-blue"
          >
            {namespaces.map((ns) => (
                <option key={ns.Name} value={ns.Name}>
                  {ns.Name === '*' ? 'All Namespaces' : ns.Name}
                </option>
            ))}
          </select>
        </div>

        {/* Job List Table */}
        {jobs.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 dark:bg-monokai-surface dark:border-monokai-yellow">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400 dark:text-monokai-yellow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-monokai-yellow">
                    No jobs found {selectedNamespace !== '*' ? `in ${selectedNamespace} namespace` : ''}
                  </p>
                </div>
              </div>
            </div>
        ) : (
            <div className="bg-white dark:bg-monokai-surface shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-monokai-surface">
                  <thead className="bg-gray-100 dark:bg-monokai-bg border-b dark:border-monokai-muted">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-monokai-muted uppercase tracking-wider">
                      Name / ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-monokai-muted uppercase tracking-wider">
                      Namespace
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-monokai-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-monokai-muted uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-monokai-muted uppercase tracking-wider">
                      Node Pool
                    </th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-monokai-muted">
                  {jobs.map((job) => (
                      <tr key={job.ID} className="hover:bg-gray-50 dark:hover:bg-monokai-bg">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-monokai-text">
                                <Link
                                    to={`/jobs/${job.ID}?namespace=${job.Namespace || 'default'}`}
                                    className="text-blue-600 hover:text-blue-800 dark:text-monokai-blue dark:hover:text-monokai-blue">
                                  {job.Name}
                                </Link>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-monokai-muted">{job.ID}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-monokai-text">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-monokai-bg dark:text-monokai-blue">
                          {job.Namespace || 'default'}
                        </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={job.Status} isStopped={job.Stop} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-monokai-text">{job.Type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-monokai-text">default</div>
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
        )}
      </div>
  );
};

export default JobList;
