import { useSearchParams } from 'react-router-dom';
import JobForm from '../components/jobs/JobForm';
import { BackLink, PageHeader } from '../components/ui';

export default function JobCreatePage() {
  const [searchParams] = useSearchParams();
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
        actions={<BackLink to="/jobs" label="Back to Jobs" />}
      />

      <JobForm
        mode="create"
        cloneFromId={cloneFromId || undefined}
        cloneNamespace={cloneNamespace}
      />
    </div>
  );
}
