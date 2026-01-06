import { useParams, useSearchParams } from 'react-router-dom';
import JobForm from '../components/jobs/JobForm';
import { BackLink, PageHeader } from '../components/ui';

export default function JobEditPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const jobId = id as string;
  const namespace = searchParams.get('namespace') || 'default';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Job"
        description="Update job configuration"
        actions={
          <BackLink
            to={`/jobs/${jobId}?namespace=${namespace}`}
            label="Back to Job"
          />
        }
      />

      <JobForm mode="edit" jobId={jobId} namespace={namespace} />
    </div>
  );
}
