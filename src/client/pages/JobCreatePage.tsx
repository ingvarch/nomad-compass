import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import JobForm from '../components/jobs/JobForm';
import { PageHeader, Button, ConfirmationDialog } from '../components/ui';

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
          <Button variant="secondary" onClick={() => setShowCancelConfirm(true)}>
            Cancel
          </Button>
        }
      />

      <ConfirmationDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => navigate('/jobs')}
        title="Cancel Job Creation"
        message="Are you sure you want to cancel? All unsaved changes will be lost."
        mode="discard"
      />

      <JobForm
        mode="create"
        cloneFromId={cloneFromId || undefined}
        cloneNamespace={cloneNamespace}
      />
    </div>
  );
}
