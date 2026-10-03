import { Link, useParams, useSearchParams } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { useFetch } from '../hooks/useFetch';
import { useAllocPath } from '../hooks/useAllocPath';
import { PageHeader, LoadingSpinner, ErrorAlert } from '../components/ui';
import { AllocationStatusBadge } from '../components/allocations';
import { DirectoryListing, FileBreadcrumbs, FileViewer } from '../components/allocations/files';
import { jobPath } from '../lib/utils/jobPath';
import type { NomadAllocation } from '../types/nomad';

function AllocationSummary({ allocation }: { allocation: NomadAllocation }) {
  return (
    <dl className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <div>
        <dt className="text-gray-500 dark:text-gray-400">Job</dt>
        <dd>
          <Link
            to={jobPath(allocation.JobID, allocation.Namespace)}
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {allocation.JobID}
          </Link>
        </dd>
      </div>
      <div>
        <dt className="text-gray-500 dark:text-gray-400">Task Group</dt>
        <dd className="font-medium text-gray-900 dark:text-white">{allocation.TaskGroup}</dd>
      </div>
      <div>
        <dt className="text-gray-500 dark:text-gray-400">Node</dt>
        <dd className="font-medium text-gray-900 dark:text-white break-all">
          {allocation.NodeName || allocation.NodeID?.slice(0, 8)}
        </dd>
      </div>
      <div>
        <dt className="text-gray-500 dark:text-gray-400">Status</dt>
        <dd className="mt-0.5">
          <AllocationStatusBadge allocation={allocation} />
        </dd>
      </div>
    </dl>
  );
}

/**
 * Directories and files of an allocation: the shared alloc/ directory and one directory per task.
 */
export default function AllocationFilesPage() {
  const { allocId = '' } = useParams<{ allocId: string }>();
  const [searchParams] = useSearchParams();
  const path = searchParams.get('path') || '/';

  const allocation = useFetch<NomadAllocation>(
    () => createNomadClient().getAllocation(allocId),
    [allocId],
    { errorMessage: 'Failed to fetch allocation' }
  );
  const view = useAllocPath(allocId, path);

  let content;
  if (view.loading) {
    content = (
      <div className="py-8">
        <LoadingSpinner />
      </div>
    );
  } else if (view.error) {
    content = <ErrorAlert message={view.error} variant="bar" className="border-0" />;
  } else if (view.data?.kind === 'dir') {
    content = <DirectoryListing allocId={allocId} dir={path} entries={view.data.entries} />;
  } else if (view.data) {
    content = (
      <FileViewer
        allocId={allocId}
        path={path}
        info={view.data.info}
        bytes={view.data.kind === 'file' ? view.data.bytes : null}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Files"
        description={allocation.data ? `Allocation directory of ${allocation.data.Name}` : 'Allocation directory'}
      />

      {allocation.error && <ErrorAlert message={allocation.error} />}
      {allocation.data && <AllocationSummary allocation={allocation.data} />}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <FileBreadcrumbs allocId={allocId} path={path} />
        </div>
        {content}
      </div>
    </div>
  );
}
