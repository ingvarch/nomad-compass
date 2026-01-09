import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { JobFormProvider, defaultFormValues } from '../../context/JobFormContext';
import { useJobForm } from '../../hooks/useJobForm';
import BasicJobInfoForm from './forms/BasicJobInfoForm';
import JobFormLayout from './forms/JobFormLayout';
import TaskGroupsSection from './forms/parts/TaskGroupsSection';
import AdvancedSettingsSection from './forms/parts/AdvancedSettingsSection';
import FormInputField from '../ui/forms/FormInputField';
import { ErrorAlert, LoadingSpinner } from '../ui';
import { PermissionErrorModal } from '../ui/PermissionErrorModal';
import DeploymentOverlay from './DeploymentOverlay';
import { JobPlanPreview } from './JobPlanPreview';
import { DEFAULT_NAMESPACE } from '../../lib/constants';

interface JobFormProps {
  mode: 'create' | 'edit';
  jobId?: string;
  namespace?: string;
  cloneFromId?: string;
  cloneNamespace?: string;
}

// Wrapper component that provides the JobFormContext
export const JobForm: React.FC<JobFormProps> = (props) => {
  const { mode, cloneFromId } = props;
  const isCloneMode = mode === 'create' && !!cloneFromId;
  const needsLoading = mode === 'edit' || isCloneMode;

  return (
    <JobFormProvider
      initialFormData={mode === 'create' && !cloneFromId ? defaultFormValues : null}
      initialLoading={needsLoading}
    >
      <JobFormContent {...props} />
    </JobFormProvider>
  );
};

// Inner component that uses the context
const JobFormContent: React.FC<JobFormProps> = ({
  mode,
  jobId,
  namespace = DEFAULT_NAMESPACE,
  cloneFromId,
  cloneNamespace = DEFAULT_NAMESPACE,
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const isEditMode = mode === 'edit';

  const {
    formData,
    isLoading,
    isSaving,
    isLoadingNamespaces,
    isNameValid,
    error,
    permissionError,
    clearPermissionError,
    success,
    namespaces,
    deploymentTracker,
    handleInputChange,
    handleSubmit,
    handlePlan,
    handleSubmitFromPlan,
    closePlanPreview,
    isPlanning,
    showPlanPreview,
    planResult,
    planError,
  } = useJobForm({ mode, jobId, namespace, cloneFromId, cloneNamespace });

  // Loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Error state (edit mode only - when job not found)
  if (error && !formData && isEditMode) {
    return (
      <ErrorAlert message={error}>
        <div className="mt-4">
          <Link
            to={`/jobs/${jobId}?namespace=${namespace}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Job
          </Link>
        </div>
      </ErrorAlert>
    );
  }

  // No data state (edit mode only)
  if (!formData && isEditMode) {
    return (
      <div
        className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 px-4 py-3 rounded relative"
        role="alert"
      >
        <span className="block sm:inline">No job data available.</span>
        <div className="mt-4">
          <Link
            to="/jobs"
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  if (!formData) {
    return null;
  }

  const title = isEditMode ? `Edit Job: ${formData.name}` : 'Create New Job';
  const submitButtonText = isEditMode ? 'Save Changes' : 'Create Job';
  const cancelHref = isEditMode ? `/jobs/${jobId}?namespace=${namespace}` : undefined;
  const loadingState = isEditMode ? isSaving : isLoading;

  return (
    <>
      {/* Permission Error Modal */}
      <PermissionErrorModal
        isOpen={!!permissionError}
        onClose={clearPermissionError}
        message={permissionError || ''}
      />

      {/* Deployment Progress Overlay */}
      {deploymentTracker.state && (
        <DeploymentOverlay
          state={deploymentTracker.state}
          onClose={deploymentTracker.stopTracking}
          onViewJob={deploymentTracker.navigateToJob}
        />
      )}

      {/* Job Plan Preview Modal */}
      <JobPlanPreview
        isOpen={showPlanPreview}
        onClose={closePlanPreview}
        onConfirm={handleSubmitFromPlan}
        planResult={planResult}
        isLoading={isPlanning}
        error={planError}
        isSubmitting={isSaving}
      />

      <JobFormLayout
        title={title}
        error={error || undefined}
        success={success || undefined}
        isLoading={loadingState}
        onSubmit={handleSubmit}
        submitButtonText={submitButtonText}
        cancelHref={cancelHref}
        onPlan={handlePlan}
        isPlanning={isPlanning}
      >
        {isEditMode ? (
          <>
            {/* Job Name (Readonly in edit mode) */}
            <FormInputField
              id="name"
              name="name"
              label="Job Name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              disabled={true}
              helpText="Job name cannot be changed after creation."
              className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            />

            {/* Namespace (Readonly in edit mode) */}
            <FormInputField
              id="namespace"
              name="namespace"
              label="Namespace"
              type="text"
              value={formData.namespace}
              onChange={handleInputChange}
              disabled={true}
              className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            />
          </>
        ) : (
          /* Basic Job Information (editable in create mode) */
          <BasicJobInfoForm
            name={formData.name}
            namespace={formData.namespace}
            namespaces={namespaces}
            onChange={handleInputChange}
            isLoading={isLoading}
            isLoadingNamespaces={isLoadingNamespaces}
            isNameValid={isNameValid}
          />
        )}

        {/* Task Groups - uses context internally, no props needed */}
        <TaskGroupsSection />

        {/* Advanced Settings Toggle */}
        <div className="mb-6 border-t pt-4">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
            <svg
              className={`ml-2 h-4 w-4 transform transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Advanced Settings Section */}
        {showAdvancedSettings && (
          <AdvancedSettingsSection
            datacenters={formData.datacenters}
            onInputChange={handleInputChange}
            isLoading={loadingState}
          />
        )}
      </JobFormLayout>
    </>
  );
};

export default JobForm;
