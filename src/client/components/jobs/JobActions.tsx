import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createNomadClient } from '../../lib/api/nomad';
import { isPermissionError, getPermissionErrorMessage, getErrorMessage } from '../../lib/errors';
import { useToast } from '../../context/ToastContext';
import { buttonSuccessSmallStyles, buttonDangerSmallStyles, buttonSecondarySmallStyles } from '../../lib/styles';
import PermissionErrorModal from '../ui/PermissionErrorModal';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

interface JobActionsProps {
    jobId: string;
    jobStatus?: string;
    onStatusChange?: () => void;
}

type ActionType = 'start' | 'stop' | 'delete' | null;

const actionConfig = {
    start: {
        title: 'Start Job',
        message: 'Are you sure you want to start this job?',
        mode: 'confirm' as const,
        confirmLabel: 'Start',
    },
    stop: {
        title: 'Stop Job',
        message: 'Are you sure you want to stop this job? Running allocations will be terminated.',
        mode: 'delete' as const,
        confirmLabel: 'Stop',
    },
    delete: {
        title: 'Delete Job',
        message: 'Are you sure you want to permanently delete this job? This action cannot be undone.',
        mode: 'delete' as const,
        confirmLabel: 'Delete',
    },
};

const JobActions: React.FC<JobActionsProps> = ({ jobId, jobStatus, onStatusChange }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated } = useAuth();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmingAction, setConfirmingAction] = useState<ActionType>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const isStopped = jobStatus?.toLowerCase() === 'dead' || false;

    const executeAction = async (action: ActionType) => {
        if (!action) return;

        setIsLoading(true);
        setError(null);
        setConfirmingAction(null);

        try {
            if (!isAuthenticated) {
                throw new Error('Authentication required');
            }

            const client = createNomadClient();
            const currentNamespace = searchParams.get('namespace') || 'default';

            switch (action) {
                case 'start': {
                    const jobSpec = await client.getJob(jobId, currentNamespace);
                    if (!jobSpec || !jobSpec.ID) {
                        throw new Error('Could not retrieve job specification');
                    }
                    if (jobSpec.Stop === true) {
                        jobSpec.Stop = false;
                    }
                    jobSpec.Namespace = currentNamespace;
                    await client.createJob({ Job: jobSpec });
                    addToast('Job started successfully', 'success');
                    onStatusChange?.();
                    break;
                }
                case 'stop': {
                    await client.stopJob(jobId, currentNamespace);
                    addToast('Job stopped successfully', 'success');
                    onStatusChange?.();
                    break;
                }
                case 'delete': {
                    await client.deleteJob(jobId, currentNamespace);
                    addToast('Job deleted successfully', 'success');
                    navigate('/jobs');
                    break;
                }
            }
        } catch (err) {
            if (isPermissionError(err)) {
                setPermissionError(getPermissionErrorMessage(`${action}-job`));
            } else {
                const errorMessage = getErrorMessage(err, `Failed to ${action} job. Please try again.`);
                setError(errorMessage);
                addToast(errorMessage, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const currentConfig = confirmingAction ? actionConfig[confirmingAction] : null;

    return (
        <>
            <PermissionErrorModal
                isOpen={!!permissionError}
                onClose={() => setPermissionError(null)}
                message={permissionError || ''}
            />

            {currentConfig && (
                <ConfirmationDialog
                    isOpen={!!confirmingAction}
                    onClose={() => setConfirmingAction(null)}
                    onConfirm={() => executeAction(confirmingAction)}
                    title={currentConfig.title}
                    message={currentConfig.message}
                    mode={currentConfig.mode}
                    confirmLabel={currentConfig.confirmLabel}
                    isLoading={isLoading}
                />
            )}

            <div className="flex items-center space-x-2">
                {error && (
                    <div className="text-red-600 text-sm mr-2">{error}</div>
                )}

                {isStopped ? (
                    <>
                        <button
                            onClick={() => setConfirmingAction('start')}
                            disabled={isLoading}
                            className={`${buttonSuccessSmallStyles} shadow-sm disabled:opacity-50`}
                        >
                            {isLoading ? 'Working...' : 'Start'}
                        </button>
                        <button
                            onClick={() => setConfirmingAction('delete')}
                            disabled={isLoading}
                            className={`${buttonSecondarySmallStyles} shadow-sm disabled:opacity-50`}
                        >
                            {isLoading ? 'Working...' : 'Delete'}
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setConfirmingAction('stop')}
                        disabled={isLoading}
                        className={`${buttonDangerSmallStyles} shadow-sm disabled:opacity-50`}
                    >
                        {isLoading ? 'Working...' : 'Stop'}
                    </button>
                )}
            </div>
        </>
    );
};

export default JobActions;
