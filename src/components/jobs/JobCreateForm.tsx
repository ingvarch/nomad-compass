// src/components/jobs/JobCreateForm.tsx
'use client';

import React, { useState } from 'react';
import { useJobForm } from '@/hooks/useJobForm';
import BasicJobInfoForm from './forms/BasicJobInfoForm';
import TaskGroupForm from './forms/TaskGroupForm';

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
        <div className="bg-white shadow rounded-lg">
            <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Job</h2>

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
                    <div className="mb-6 border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Task Groups</h3>
                            <button
                                type="button"
                                onClick={addTaskGroup}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={isLoading}
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
                                    isLoading={isLoading}
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
                                    disabled={isLoading}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Comma-separated list of datacenters where this job can run
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div>
                        <button
                            type="submit"
                            className={`w-full py-2 px-4 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                                !isNameValid || isLoading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                            disabled={!isNameValid || isLoading}
                        >
                            {isLoading ? 'Creating...' : 'Create Job'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JobCreateForm;
