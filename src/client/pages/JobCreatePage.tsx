import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import JobForm from '../components/jobs/JobForm';
import { PageHeader, Modal } from '../components/ui';

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

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    navigate('/jobs');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <button
            onClick={handleCancelClick}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        }
      />

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Cancel Job Creation"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to cancel? All unsaved changes will be lost.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowCancelConfirm(false)}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Stay
          </button>
          <button
            onClick={handleConfirmCancel}
            className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Discard
          </button>
        </div>
      </Modal>

      <JobForm
        mode="create"
        cloneFromId={cloneFromId || undefined}
        cloneNamespace={cloneNamespace}
      />
    </div>
  );
}
