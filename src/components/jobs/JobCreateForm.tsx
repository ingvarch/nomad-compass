// src/components/jobs/JobCreateForm.tsx
'use client';

import React, { useState } from 'react';
import { useJobForm } from '@/hooks/useJobForm';
import BasicJobInfoForm from './forms/BasicJobInfoForm';
import JobFormLayout from './forms/JobFormLayout';
import TaskGroupsSection from './forms/parts/TaskGroupsSection';
import AdvancedSettingsSection from './forms/parts/AdvancedSettingsSection';
import AdvancedSettingsToggle from './forms/parts/AdvancedSettingsToggle';

export const JobCreateForm: React.FC = () => {
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    const {
        formData,
        isLoading,
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
        handleSubmit
    } = useJobForm();

    return (
        <JobFormLayout
            title="Create New Job"
            error={error || undefined}
            success={success || undefined}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            submitButtonText="Create Job"
        >
            {/* Basic Job Information */}
            <BasicJobInfoForm
                name={formData.name}
                namespace={formData.namespace}
                count={0} // Not used in the new form
                datacenters={formData.datacenters}
                namespaces={namespaces}
                onChange={handleInputChange}
                isLoading={isLoading}
                isLoadingNamespaces={isLoadingNamespaces}
                isNameValid={isNameValid}
            />

            {/* Task Groups (Containers) */}
            <TaskGroupsSection
                taskGroups={formData.taskGroups}
                jobName={formData.name}
                namespace={formData.namespace}
                isLoading={isLoading}
                onAddTaskGroup={addTaskGroup}
                onGroupInputChange={handleGroupInputChange}
                onGroupCheckboxChange={handleGroupCheckboxChange as (groupIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void}
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
                    isLoading={isLoading}
                />
            )}
        </JobFormLayout>
    );
};

export default JobCreateForm;
