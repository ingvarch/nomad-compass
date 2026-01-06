import JobForm from '../components/jobs/JobForm';
import { BackLink, PageHeader } from '../components/ui';

export default function JobCreatePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New Job"
        description="Create a new job to run in your Nomad cluster"
        actions={<BackLink to="/jobs" label="Back to Jobs" />}
      />

      <JobForm mode="create" />
    </div>
  );
}
