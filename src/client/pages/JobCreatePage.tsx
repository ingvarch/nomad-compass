import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import JobForm from '../components/jobs/JobForm';
import { PageHeader, CancelConfirmationDialog } from '../components/ui';

export default function JobCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const cloneFromId = searchParams.get('clone');
  const cloneNamespace = searchParams.get('namespace') || 'default';

  const isCloneMode = !!cloneFromId;
  const title = isCloneMode ? 'Clone Job' : 'Create New Job';
  const description = isCloneMode
    ? 'Create a copy of an existing job with a new name'
    : 'Create a new job to run in your Nomad cluster';

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        }
      />

      <CancelConfirmationDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => navigate('/jobs')}
        title="Cancel Job Creation"
      />

      <JobForm
        mode="create"
        cloneFromId={cloneFromId || undefined}
        cloneNamespace={cloneNamespace}
      />
    </div>
  );
}
