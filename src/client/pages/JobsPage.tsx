// src/client/pages/JobsPage.tsx
import { Link } from 'react-router-dom';
import JobList from '../components/jobs/JobList';
import { PageHeader } from '../components/ui';

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nomad Jobs"
        description="View and manage jobs running in your Nomad cluster"
        actions={
          <Link
            to="/jobs/create"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Job
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
