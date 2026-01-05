import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useJobForm } from '../../hooks/useJobForm';
import BasicJobInfoForm from './forms/BasicJobInfoForm';
import JobFormLayout from './forms/JobFormLayout';
import TaskGroupsSection from './forms/parts/TaskGroupsSection';
import AdvancedSettingsSection from './forms/parts/AdvancedSettingsSection';
import AdvancedSettingsToggle from './forms/parts/AdvancedSettingsToggle';
import FormInputField from '../ui/forms/FormInputField';
import { ErrorAlert } from '../ui/ErrorAlert';

interface JobFormProps {
  mode: 'create' | 'edit';
  jobId?: string;
  namespace?: string;
}

export const JobForm: React.FC<JobFormProps> = ({
  mode,
  jobId,
  namespace = 'default',
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
    success,
    namespaces,
    handleInputChange,
    handleGroupInputChange,
    handleSelectChange,
    handleGroupCheckboxChange,
    handleEnvVarChange,
    addEnvVar,
    removeEnvVar,
    handlePortChange,
    addPort,
    removePort,
    handleHealthCheckChange,
    addTaskGroup,
    removeTaskGroup,
    handleSubmit,
  } = useJobForm({ mode, jobId, namespace });

  // Loading state
  if (isLoading || (!formData && mode === 'create')) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
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
    <JobFormLayout
      title={title}
      error={error || undefined}
      success={success || undefined}
      isLoading={loadingState}
      onSubmit={handleSubmit}
      submitButtonText={submitButtonText}
      cancelHref={cancelHref}
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
          count={0}
          datacenters={formData.datacenters}
          namespaces={namespaces}
          onChange={handleInputChange}
          isLoading={isLoading}
          isLoadingNamespaces={isLoadingNamespaces}
          isNameValid={isNameValid}
        />
      )}

      {/* Task Groups (Containers) */}
      <TaskGroupsSection
        taskGroups={formData.taskGroups}
        jobName={formData.name}
        namespace={formData.namespace}
        isLoading={loadingState}
        onAddTaskGroup={addTaskGroup}
        onGroupInputChange={handleGroupInputChange}
        onGroupCheckboxChange={
          handleGroupCheckboxChange as (
            groupIndex: number,
            e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
          ) => void
        }
        onEnvVarChange={handleEnvVarChange}
        onAddEnvVar={addEnvVar}
        onRemoveEnvVar={removeEnvVar}
        onPortChange={handlePortChange}
        onAddPort={addPort}
        onRemovePort={removePort}
        onHealthCheckChange={handleHealthCheckChange}
        onRemoveTaskGroup={removeTaskGroup}
      />

      {/* Advanced Settings Toggle */}
      <AdvancedSettingsToggle
        showAdvancedSettings={showAdvancedSettings}
        setShowAdvancedSettings={setShowAdvancedSettings}
      />

      {/* Advanced Settings Section */}
      {showAdvancedSettings && (
        <AdvancedSettingsSection
          datacenters={formData.datacenters}
          onInputChange={handleInputChange}
          isLoading={loadingState}
        />
      )}
    </JobFormLayout>
  );
};

export default JobForm;
