import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { createNomadClient } from '../../../lib/api/nomad';
import { useToast } from '../../../context/ToastContext';
import { isPermissionError, getPermissionErrorMessage, getErrorMessage } from '../../../lib/errors';
import { PermissionErrorModal } from '../../ui/PermissionErrorModal';

interface JobHeaderProps {
  jobName: string;
  jobId: string;
  namespace: string;
}

export const JobHeader: React.FC<JobHeaderProps> = ({ jobName, jobId, namespace }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!isAuthenticated) {
      addToast('Authentication required', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      const client = createNomadClient();
      await client.deleteJob(jobId, namespace);
      addToast('Job deleted successfully', 'success');
      navigate('/jobs');
    } catch (err) {
      if (isPermissionError(err)) {
        setPermissionError(getPermissionErrorMessage('delete-job'));
      } else {
        addToast(getErrorMessage(err, 'Failed to delete job'), 'error');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <PermissionErrorModal
        isOpen={!!permissionError}
        onClose={() => setPermissionError(null)}
        message={permissionError || ''}
      />

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
          {/* Edit - Green */}
          <Link
            to={`/jobs/${jobId}/edit?namespace=${namespace}`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>

          {/* Clone - Blue */}
          <Link
            to={`/jobs/create?clone=${jobId}&namespace=${namespace}`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Clone
          </Link>

          {/* Delete - Red with confirmation */}
          {showDeleteConfirm ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}

          {/* Back - Gray (unchanged) */}
          <Link
            to="/jobs"
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Jobs
          </Link>
        </div>
      </div>
    </>
  );
};

export default JobHeader;
