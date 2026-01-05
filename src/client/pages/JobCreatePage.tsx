import { Link } from 'react-router-dom';
import JobForm from '../components/jobs/JobForm';

export default function JobCreatePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Create New Job
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Create a new job to run in your Nomad cluster
          </p>
        </div>
        <div>
          <Link
            to="/jobs"
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Jobs
          </Link>
        </div>
      </div>

      <JobForm mode="create" />
    </div>
  );
}
