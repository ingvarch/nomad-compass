import React from 'react';
import type { DeploymentState, DeploymentStep } from '../../types/deployment';
import { DEPLOYMENT_STEPS, STEP_LABELS } from '../../lib/constants/deployment';
import { Spinner } from '../ui';

interface DeploymentOverlayProps {
  state: DeploymentState;
  onClose: () => void;
  onViewJob: () => void;
}

const stepIconStyles = {
  completed: 'text-green-500 dark:text-green-400',
  current: 'text-blue-500 dark:text-monokai-blue animate-pulse',
  pending: 'text-gray-300 dark:text-gray-600',
  failed: 'text-red-500 dark:text-red-400',
};

function getStepStatus(
  step: DeploymentStep,
  currentStep: DeploymentStep,
  progress: number = 0
): 'completed' | 'current' | 'pending' | 'failed' {
  const stepIndex = DEPLOYMENT_STEPS.indexOf(step);

  if (currentStep === 'failed' || currentStep === 'timeout') {
    // Determine which step failed based on progress
    // Progress: 20=submitting, 40=scheduling, 60=pulling, 80=starting, 100=healthy
    const failedStepIndex = Math.max(0, Math.floor(progress / 20) - 1);

    if (stepIndex < failedStepIndex) return 'completed';
    if (stepIndex === failedStepIndex) return 'failed';
    return 'pending';
  }

  const currentIndex = DEPLOYMENT_STEPS.indexOf(currentStep);

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  return 'pending';
}

function StepIcon({ status }: { status: 'completed' | 'current' | 'pending' | 'failed' }) {
  if (status === 'completed') {
    return (
      <svg className={`w-5 h-5 ${stepIconStyles.completed}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  }

  if (status === 'current') {
    return (
      <div className={stepIconStyles.current}>
        <Spinner size="md" />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <svg className={`w-5 h-5 ${stepIconStyles.failed}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  }

  return (
    <div className={`w-5 h-5 rounded-full border-2 border-current ${stepIconStyles.pending}`} />
  );
}

const DeploymentOverlay: React.FC<DeploymentOverlayProps> = ({
  state,
  onClose,
  onViewJob,
}) => {
  const isFailed = state.step === 'failed';
  const isTimeout = state.step === 'timeout';
  const isError = isFailed || isTimeout;

  const title = isFailed
    ? 'Deployment Failed'
    : isTimeout
      ? 'Deployment Timeout'
      : `Deploying "${state.jobId}"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" />

      {/* Modal */}
      <div className="relative bg-white dark:bg-monokai-bg rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Title */}
        <h2 className={`text-xl font-semibold mb-6 ${isError ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-monokai-text'}`}>
          {title}
        </h2>

        {/* Steps */}
        <div className="space-y-4 mb-6">
          {DEPLOYMENT_STEPS.map((step) => {
            const status = getStepStatus(step, state.step, state.progress);
            const isCurrent = status === 'current';

            return (
              <div key={step} className="flex items-center gap-3">
                <StepIcon status={status} />
                <span
                  className={`text-sm ${
                    status === 'completed'
                      ? 'text-gray-600 dark:text-gray-400'
                      : status === 'current'
                        ? 'text-blue-600 dark:text-monokai-blue font-medium'
                        : status === 'failed'
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {STEP_LABELS[step]}
                  {isCurrent && !isError && '...'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar (only when not error) */}
        {!isError && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 dark:bg-monokai-blue transition-all duration-500 ease-out"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">
              {state.progress}%
            </div>
          </div>
        )}

        {/* Error message */}
        {isError && state.error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-300">{state.error}</p>
          </div>
        )}

        {/* Buttons (only for error states) */}
        {isError && (
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Close
            </button>
            <button
              onClick={onViewJob}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-monokai-blue dark:hover:bg-blue-600 rounded-md transition-colors"
            >
              {isFailed ? 'View Logs' : 'View Job'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentOverlay;
