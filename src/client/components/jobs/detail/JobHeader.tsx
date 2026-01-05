import React from 'react';
import { Link } from 'react-router-dom';

interface JobHeaderProps {
  jobName: string;
  jobId: string;
  namespace: string;
}

export const JobHeader: React.FC<JobHeaderProps> = ({ jobName, jobId, namespace }) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {jobName}
        </h1>
        <div className="flex items-center space-x-4 mt-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Job ID: {jobId}
          </p>
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Namespace: {namespace}
          </span>
        </div>
      </div>
      <div className="flex space-x-2">
        <Link
          to={`/jobs/${jobId}/edit?namespace=${namespace}`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Edit
        </Link>
        <Link
          to="/jobs"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to Jobs
        </Link>
      </div>
    </div>
  );
};

export default JobHeader;
