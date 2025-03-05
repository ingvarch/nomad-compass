// src/components/jobs/JobEditForm.tsx
'use client';

import React, { useState } from 'react';
import { useJobEditForm } from '@/hooks/useJobEditForm';
import Link from 'next/link';
import TaskGroupForm from './forms/TaskGroupForm';

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
        <div className="bg-white shadow rounded-lg">
            <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Edit Job: {formData.name}</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Job Name (Readonly) */}
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Job Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                            disabled={true}
                            readOnly
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Job name cannot be changed after creation.
                        </p>
                    </div>

                    {/* Namespace (Readonly) */}
                    <div className="mb-4">
                        <label htmlFor="namespace" className="block text-sm font-medium text-gray-700 mb-1">
                            Namespace
                        </label>
                        <input
                            id="namespace"
                            name="namespace"
                            type="text"
                            value={formData.namespace}
                            className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                            disabled={true}
                            readOnly
                        />
                    </div>

                    {/* Task Groups (Containers) */}
                    <div className="mb-6 border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Task Groups</h3>
                            <button
                                type="button"
                                onClick={addTaskGroup}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={isSaving}
                            >
                                Add Task Group
                            </button>
                        </div>

                        <div className="space-y-6">
                            {formData.taskGroups.map((group, index) => (
                                <TaskGroupForm
                                    key={index}
                                    groupIndex={index}
                                    group={group}
                                    isFirst={index === 0}
                                    onInputChange={(e) => handleGroupInputChange(index, e)}
                                    onCheckboxChange={(e) => handleGroupCheckboxChange(index, e)}
                                    onEnvVarChange={(varIndex, field, value) => handleEnvVarChange(index, varIndex, field, value)}
                                    onAddEnvVar={() => addEnvVar(index)}
                                    onRemoveEnvVar={(varIndex) => removeEnvVar(index, varIndex)}
                                    onPortChange={(portIndex, field, value) => handlePortChange(index, portIndex, field, value)}
                                    onAddPort={() => addPort(index)}
                                    onRemovePort={(portIndex) => removePort(index, portIndex)}
                                    onHealthCheckChange={(field, value) => handleHealthCheckChange(index, field, value)}
                                    onRemoveGroup={() => removeTaskGroup(index)}
                                    jobName={formData.name}
                                    namespace={formData.namespace}
                                    isLoading={isSaving}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <div className="mb-6 border-t pt-4">
                        <button
                            type="button"
                            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {showAdvancedSettings ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                        </button>
                    </div>

                    {/* Advanced Settings Section */}
                    {showAdvancedSettings && (
                        <div className="mb-6 border p-4 rounded-md bg-gray-50">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>

                            {/* Datacenters */}
                            <div className="mb-4">
                                <label htmlFor="datacenters" className="block text-sm font-medium text-gray-700 mb-1">
                                    Datacenters
                                </label>
                                <input
                                    id="datacenters"
                                    name="datacenters"
                                    type="text"
                                    value={formData.datacenters.join(', ')}
                                    onChange={handleInputChange}
                                    placeholder="dc1, dc2, dc3"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isSaving}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Comma-separated list of datacenters where this job can run
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between">
                        <button
                            type="submit"
                            className={`py-2 px-4 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                                isSaving
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>

                        <Link
                            href={`/jobs/${jobId}?namespace=${namespace}`}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JobEditForm;
