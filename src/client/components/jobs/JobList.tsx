import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createNomadClient } from '../../lib/api/nomad';
import { getErrorMessage } from '../../lib/errors';
import { NomadJob, NomadNamespace } from '../../types/nomad';
import { LoadingSpinner, ErrorAlert, Badge } from '../ui';
import DataTable, { type Column } from '../ui/DataTable';
import { StatusBadge } from './detail/StatusBadge';

const jobColumns: Column<NomadJob>[] = [
  {
    key: 'name',
    header: 'Name / ID',
    render: (job) => (
      <div className="flex items-center">
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900 dark:text-monokai-text">
            <Link
              to={`/jobs/${job.ID}?namespace=${job.Namespace || 'default'}`}
              className="text-blue-600 hover:text-blue-800 dark:text-monokai-blue dark:hover:text-monokai-blue"
            >
              {job.Name}
            </Link>
          </div>
          <div className="text-xs text-gray-500 dark:text-monokai-muted">{job.ID}</div>
        </div>
      </div>
    ),
  },
  {
    key: 'namespace',
    header: 'Namespace',
    render: (job) => (
      <Badge variant="blue">{job.Namespace || 'default'}</Badge>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (job) => <StatusBadge status={job.Status} isStopped={job.Stop} />,
  },
  {
    key: 'type',
    header: 'Type',
    render: (job) => (
      <span className="text-sm text-gray-900 dark:text-monokai-text">{job.Type}</span>
    ),
  },
  {
    key: 'nodePool',
    header: 'Node Pool',
    render: () => (
      <span className="text-sm text-gray-900 dark:text-monokai-text">default</span>
    ),
  },
];

const JobList: React.FC = () => {
  const [jobs, setJobs] = useState<NomadJob[]>([]);
  const [namespaces, setNamespaces] = useState<NomadNamespace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedNamespace = searchParams.get('namespace') || '*';

  useEffect(() => {
    const fetchNamespacesAndJobs = async () => {
      if (!isAuthenticated) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      try {
        const client = createNomadClient();

        const nsResponse = await client.getNamespaces();
        const sortedNamespaces = [
          { Name: '*', Description: 'All Namespaces' },
          ...nsResponse.sort((a, b) => a.Name.localeCompare(b.Name))
        ];
        setNamespaces(sortedNamespaces);

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

  const handleNamespaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '*') {
      searchParams.delete('namespace');
    } else {
      searchParams.set('namespace', value);
    }
    setSearchParams(searchParams);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} showTitle />;
  }

  return (
    <div>
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

      <DataTable
        items={jobs}
        columns={jobColumns}
        keyExtractor={(job) => job.ID}
        emptyState={{
          message: `No jobs found${selectedNamespace !== '*' ? ` in ${selectedNamespace} namespace` : ''}`,
        }}
      />
    </div>
  );
};

export default JobList;
