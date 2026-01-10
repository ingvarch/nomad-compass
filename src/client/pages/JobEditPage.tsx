import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import JobForm from '../components/jobs/JobForm';
import { PageHeader, Button, ConfirmationDialog } from '../components/ui';
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
          <Button variant="secondary" onClick={() => setShowCancelConfirm(true)}>
            Cancel
          </Button>
        }
      />

      <ConfirmationDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => navigate(`/jobs/${jobId}?namespace=${namespace}`)}
        title="Cancel Editing"
        message="Are you sure you want to cancel? All unsaved changes will be lost."
        mode="discard"
      />

      <JobForm mode="edit" jobId={jobId} namespace={namespace} />
    </div>
  );
}
