import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createNomadClient } from '../../lib/api/nomad';
import { isPermissionError, getPermissionErrorMessage } from '../../lib/api/errors';
import { useToast } from '../../context/ToastContext';
import { PermissionErrorModal } from '../ui/PermissionErrorModal';
import { X, Check } from 'lucide-react';

interface JobActionsProps {
    jobId: string;
    jobStatus?: string;
    onStatusChange?: () => void;
}

export const JobActions: React.FC<JobActionsProps> = ({ jobId, jobStatus, onStatusChange }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated } = useAuth();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [confirmingAction, setConfirmingAction] = useState<'start' | 'stop' | 'delete' | null>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    // Determine if the job is stopped based on status
    const isStopped = jobStatus?.toLowerCase() === 'dead' || false;
    // Determine if the job is running
    const isRunning = jobStatus?.toLowerCase() === 'running';

    const requestConfirmation = (action: 'start' | 'stop' | 'delete') => {
        setConfirmingAction(action);
        setTimeout(() => {
            if (confirmingAction === action) {
                setConfirmingAction(null);
            }
        }, 10000);
    };

    const cancelAction = () => {
        setConfirmingAction(null);
    };

    const startJob = async () => {
        setIsLoading(true);
        setError(null);
        setConfirmingAction(null);

        try {
            if (!isAuthenticated) {
                throw new Error('Authentication required');
            }

            const client = createNomadClient();
            const currentNamespace = searchParams.get('namespace') || 'default';

            // Get the job specification
            const jobSpec = await client.getJob(jobId, currentNamespace);

            // Check if the job has a valid specification
            if (!jobSpec || !jobSpec.ID) {
                throw new Error('Could not retrieve job specification');
            }

            // Make sure the job is not marked as stopped
            if (jobSpec.Stop === true) {
                jobSpec.Stop = false;
            }

            jobSpec.Namespace = currentNamespace;

            // Submit the job again with the updated spec
            await client.createJob({ Job: jobSpec });

            addToast('Job started successfully', 'success');

            if (onStatusChange) {
                onStatusChange();
            }
        } catch (err) {
            if (isPermissionError(err)) {
                setPermissionError(getPermissionErrorMessage('start-job'));
            } else {
                const errorMessage = typeof err === 'object' && err !== null && 'message' in err
                    ? (err as Error).message
                    : 'Failed to start job. Please try again.';
                setError(errorMessage);
                addToast(errorMessage, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const stopJob = async () => {
        setIsLoading(true);
        setError(null);
        setConfirmingAction(null);

        try {
            if (!isAuthenticated) {
                throw new Error('Authentication required');
            }

            const client = createNomadClient();
            const currentNamespace = searchParams.get('namespace') || 'default';
            await client.stopJob(jobId, currentNamespace);

            addToast('Job stopped successfully', 'success');

            if (onStatusChange) {
                onStatusChange();
            }
        } catch (err) {
            if (isPermissionError(err)) {
                setPermissionError(getPermissionErrorMessage('stop-job'));
            } else {
                const errorMessage = typeof err === 'object' && err !== null && 'message' in err
                    ? (err as Error).message
                    : 'Failed to stop job. Please try again.';
                setError(errorMessage);
                addToast(errorMessage, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const deleteJob = async () => {
        setIsLoading(true);
        setError(null);
        setConfirmingAction(null);

        try {
            if (!isAuthenticated) {
                throw new Error('Authentication required');
            }

            const client = createNomadClient();
            const currentNamespace = searchParams.get('namespace') || 'default';
            await client.deleteJob(jobId, currentNamespace);

            addToast('Job deleted successfully', 'success');

            navigate('/jobs');
        } catch (err) {
            if (isPermissionError(err)) {
                setPermissionError(getPermissionErrorMessage('delete-job'));
            } else {
                const errorMessage = typeof err === 'object' && err !== null && 'message' in err
                    ? (err as Error).message
                    : 'Failed to delete job. Please try again.';
                setError(errorMessage);
                addToast(errorMessage, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const confirmButtonStyle = "inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2";
    const confirmYesStyle = "bg-green-600 hover:bg-green-700 focus:ring-green-500";
    const confirmNoStyle = "bg-gray-500 hover:bg-gray-600 focus:ring-gray-400 ml-2";

    return (
        <>
        <PermissionErrorModal
            isOpen={!!permissionError}
            onClose={() => setPermissionError(null)}
            message={permissionError || ''}
        />
        <div className="flex items-center space-x-2">
            {error && (
                <div className="text-red-600 text-sm mr-2">{error}</div>
            )}

            {isStopped ? (
                <>
                    {confirmingAction === 'start' ? (
                        <div className="flex items-center">
                            <span className="text-sm text-gray-700 mr-2">Start job?</span>
                            <button
                                onClick={startJob}
                                disabled={isLoading}
                                className={`${confirmButtonStyle} ${confirmYesStyle}`}
                            >
                                <Check size={16} className="mr-1" /> Yes, Start
                            </button>
                            <button
                                onClick={cancelAction}
                                disabled={isLoading}
                                className={`${confirmButtonStyle} ${confirmNoStyle}`}
                            >
                                <X size={16} className="mr-1" /> Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => requestConfirmation('start')}
                            disabled={isLoading}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                            {isLoading ? 'Working...' : 'Start'}
                        </button>
                    )}

                    {confirmingAction === 'delete' ? (
                        <div className="flex items-center">
                            <span className="text-sm text-gray-700 mr-2">Delete permanently?</span>
                            <button
                                onClick={deleteJob}
                                disabled={isLoading}
                                className={`${confirmButtonStyle} ${confirmYesStyle}`}
                            >
                                <Check size={16} className="mr-1" /> Yes, Delete
                            </button>
                            <button
                                onClick={cancelAction}
                                disabled={isLoading}
                                className={`${confirmButtonStyle} ${confirmNoStyle}`}
                            >
                                <X size={16} className="mr-1" /> Cancel
                            </button>
                        </div>
                    ) : (
                        confirmingAction !== 'start' && (
                            <button
                                onClick={() => requestConfirmation('delete')}
                                disabled={isLoading}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                            >
                                {isLoading ? 'Working...' : 'Delete'}
                            </button>
                        )
                    )}
                </>
            ) : (
                <>
                    {confirmingAction === 'stop' ? (
                        <div className="flex items-center">
                            <span className="text-sm text-gray-700 mr-2">Stop job?</span>
                            <button
                                onClick={stopJob}
                                disabled={isLoading}
                                className={`${confirmButtonStyle} ${confirmYesStyle}`}
                            >
                                <Check size={16} className="mr-1" /> Yes, Stop
                            </button>
                            <button
                                onClick={cancelAction}
                                disabled={isLoading}
                                className={`${confirmButtonStyle} ${confirmNoStyle}`}
                            >
                                <X size={16} className="mr-1" /> Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => requestConfirmation('stop')}
                            disabled={isLoading}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                            {isLoading ? 'Working...' : 'Stop'}
                        </button>
                    )}
                </>
            )}
        </div>
        </>
    );
};

export default JobActions;
