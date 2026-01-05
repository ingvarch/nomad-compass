// src/client/pages/JobsPage.tsx
import { Link } from 'react-router-dom';
import JobList from '../components/jobs/JobList';

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Nomad Jobs
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and manage jobs running in your Nomad cluster
          </p>
        </div>
        <div>
          <Link
            to="/jobs/create"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Job
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="p-6">
          <JobList />
        </div>
      </div>
    </div>
  );
}
