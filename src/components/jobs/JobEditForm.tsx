// src/components/jobs/JobEditForm.tsx
'use client';

import React, { useState } from 'react';
import { useJobEditForm } from '@/hooks/useJobEditForm';
import Link from 'next/link';
import JobFormLayout from './forms/JobFormLayout';
import TaskGroupsSection from './forms/parts/TaskGroupsSection';
import AdvancedSettingsSection from './forms/parts/AdvancedSettingsSection';
import AdvancedSettingsToggle from './forms/parts/AdvancedSettingsToggle';
import FormInputField from '../ui/forms/FormInputField';

interface JobEditFormProps {
    jobId: string;
    namespace?: string;
}

export const JobEditForm: React.FC<JobEditFormProps> = ({ jobId, namespace = 'default' }) => {
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    const {
        formData,
        initialJob,
        isLoading,
        isSaving,
        isLoadingNamespaces,
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
    } = useJobEditForm(jobId, namespace);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error && !formData) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <div className="mt-4">
                    <Link
                        href={`/jobs/${jobId}?namespace=${namespace}`}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Back to Job
                    </Link>
                </div>
            </div>
        );
    }

    if (!formData) {
        return (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">No job data available.</span>
                <div className="mt-4">
                    <Link
                        href="/jobs"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Back to Jobs
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <JobFormLayout
            title={`Edit Job: ${formData.name}`}
            error={error || undefined}
            success={success || undefined}
            isLoading={isSaving}
            onSubmit={handleSubmit}
            submitButtonText="Save Changes"
            cancelHref={`/jobs/${jobId}?namespace=${namespace}`}
        >
            {/* Job Name (Readonly) */}
            <FormInputField
                id="name"
                name="name"
                label="Job Name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                disabled={true}
                helpText="Job name cannot be changed after creation."
                className="bg-gray-100 cursor-not-allowed"
            />

            {/* Namespace (Readonly) */}
            <FormInputField
                id="namespace"
                name="namespace"
                label="Namespace"
                type="text"
                value={formData.namespace}
                onChange={handleInputChange}
                disabled={true}
                className="bg-gray-100 cursor-not-allowed"
            />

            {/* Task Groups (Containers) */}
            <TaskGroupsSection
                taskGroups={formData.taskGroups}
                jobName={formData.name}
                namespace={formData.namespace}
                isLoading={isSaving}
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
                    isLoading={isSaving}
                />
            )}
        </JobFormLayout>
    );
};

export default JobEditForm;
