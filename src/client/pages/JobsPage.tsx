// src/client/pages/JobsPage.tsx
import { Link } from 'react-router-dom';
import JobList from '../components/jobs/JobList';
import { PageHeader, Button } from '../components/ui';

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nomad Jobs"
        description="View and manage jobs running in your Nomad cluster"
        actions={
          <Link to="/jobs/create">
            <Button variant="primary">Create Job</Button>
          </Link>
        }
      />

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="p-6">
          <JobList />
        </div>
      </div>
    </div>
  );
}
