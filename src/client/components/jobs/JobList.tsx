import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createNomadClient } from '../../lib/api/nomad';
import { getErrorMessage } from '../../lib/errors';
import { NomadJob, NomadNamespace } from '../../types/nomad';
import { LoadingSpinner, ErrorAlert } from '../ui';
import InfoBox from '../ui/InfoBox';
import { StatusBadge } from './detail/StatusBadge';

const JobList: React.FC = () => {
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
        setError(`Failed to load namespaces or jobs: ${getErrorMessage(err)}`);
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
            <InfoBox type="warning">
              No jobs found {selectedNamespace !== '*' ? `in ${selectedNamespace} namespace` : ''}
            </InfoBox>
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
