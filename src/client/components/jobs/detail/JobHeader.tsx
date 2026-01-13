import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { createNomadClient } from '../../../lib/api/nomad';
import { useToast } from '../../../context/ToastContext';
import { isPermissionError, getPermissionErrorMessage, getErrorMessage } from '../../../lib/errors';
import { buttonPrimaryStyles, buttonDangerStyles, buttonSecondaryStyles, buttonSuccessStyles } from '../../../lib/styles';
import PermissionErrorModal from '../../ui/PermissionErrorModal';
import { ConfirmationDialog } from '../../ui/ConfirmationDialog';
import { Badge } from '../../ui';

interface JobHeaderProps {
  jobName: string;
  jobId: string;
  namespace: string;
}

const JobHeader: React.FC<JobHeaderProps> = ({ jobName, jobId, namespace }) => {
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

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Job"
        message={`Are you sure you want to delete job "${jobName}"? This action cannot be undone.`}
        mode="delete"
        isLoading={isDeleting}
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
            <Badge variant="blue">Namespace: {namespace}</Badge>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link
            to={`/jobs/${jobId}/edit?namespace=${namespace}`}
            className={`${buttonSuccessStyles} shadow-sm`}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>

          <Link
            to={`/jobs/create?clone=${jobId}&namespace=${namespace}`}
            className={`${buttonPrimaryStyles} shadow-sm`}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Clone
          </Link>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className={`${buttonDangerStyles} shadow-sm`}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>

          <Link
            to="/jobs"
            className={`${buttonSecondaryStyles} shadow-sm`}
          >
            Back to Jobs
          </Link>
        </div>
      </div>
    </>
  );
};

export default JobHeader;
