import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import JobForm from '../components/jobs/JobForm';
import { PageHeader, CancelConfirmationDialog } from '../components/ui';
import { DEFAULT_NAMESPACE } from '../lib/constants';

export default function JobEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const jobId = id as string;
  const namespace = searchParams.get('namespace') || DEFAULT_NAMESPACE;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Job"
        description="Update job configuration"
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
        onConfirm={() => navigate(`/jobs/${jobId}?namespace=${namespace}`)}
        title="Cancel Editing"
      />

      <JobForm mode="edit" jobId={jobId} namespace={namespace} />
    </div>
  );
}
