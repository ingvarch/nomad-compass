import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createNomadClient } from '../../lib/api/nomad';
import { getErrorMessage } from '../../lib/errors';
import { NomadJobListStub, NomadNamespace } from '../../types/nomad';
import { LoadingSpinner, ErrorAlert, Badge, Select } from '../ui';
import DataTable, { type Column } from '../ui/DataTable';
import { StatusBadge } from './detail/StatusBadge';
import { jobPath } from '../../lib/utils/jobPath';
import { listedJobs } from '../../lib/services/periodicService';

export const jobColumns: Column<NomadJobListStub>[] = [
  {
    key: 'name',
    header: 'Name / ID',
    render: (job) => (
      <div className="flex items-center">
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900 dark:text-monokai-text">
            <Link
              to={jobPath(job.ID, job.Namespace || 'default')}
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
      <span className="text-sm text-gray-900 dark:text-monokai-text">
        {job.Type}
        {job.Periodic && (
          <Badge variant="purple" className="ml-2">
            periodic
          </Badge>
        )}
      </span>
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
  const [jobs, setJobs] = useState<NomadJobListStub[]>([]);
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
        setJobs(listedJobs(jobsResponse.Jobs || []));
        setError(null);
      } catch (err) {
        setError(`Failed to load namespaces or jobs: ${getErrorMessage(err)}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNamespacesAndJobs();
  }, [isAuthenticated, selectedNamespace]);

  const handleNamespaceChange = (value: string) => {
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
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="namespace-select" className="text-sm font-medium text-gray-700 dark:text-monokai-text shrink-0">
          Namespace:
        </label>
        <Select
          id="namespace-select"
          value={selectedNamespace}
          onChange={handleNamespaceChange}
          options={namespaces.map((ns) => ({
            value: ns.Name,
            label: ns.Name === '*' ? 'All Namespaces' : ns.Name,
          }))}
          className="min-w-[160px]"
        />
      </div>

      <DataTable
        items={jobs}
        columns={jobColumns}
        keyExtractor={(job) => job.ID}
        emptyState={{
          message: `No jobs found${selectedNamespace !== '*' ? ` in ${selectedNamespace} namespace` : ''}`,
        }}
        mobileCardRenderer={(job) => (
          <Link
            to={jobPath(job.ID, job.Namespace || 'default')}
            className="block p-4 hover:bg-gray-50 dark:hover:bg-monokai-surface/60 active:bg-gray-100 dark:active:bg-monokai-surface transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-monokai-text truncate">
                  {job.Name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-monokai-muted font-mono truncate mt-0.5">
                  {job.ID}
                </p>
              </div>
              <StatusBadge status={job.Status} isStopped={job.Stop} />
            </div>

            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <Badge variant="blue">{job.Namespace || 'default'}</Badge>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-monokai-surface text-gray-700 dark:text-monokai-muted capitalize font-medium">
                {job.Type}
              </span>
              {job.Periodic && (
                <Badge variant="purple">periodic</Badge>
              )}
            </div>
          </Link>
        )}
      />
    </div>
  );
};

export default JobList;
