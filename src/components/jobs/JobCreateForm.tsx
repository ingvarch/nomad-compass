// src/components/jobs/JobCreateForm.tsx
'use client';

import React, { useState } from 'react';
import { useJobForm } from '@/hooks/useJobForm';
import BasicJobInfoForm from './forms/BasicJobInfoForm';
import ResourcesForm from './forms/ResourcesForm';
import EnvironmentVariablesForm from './forms/EnvironmentVariablesForm';
import DockerAuthForm from './forms/DockerAuthForm';
import AdvancedSettingsForm from './forms/AdvancedSettingsForm';

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
        handleSelectChange,
        handleCheckboxChange,
        handleEnvVarChange,
        addEnvVar,
        removeEnvVar,
        handlePortChange,
        addPort,
        removePort,
        handleHealthCheckChange,
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
                        image={formData.image}
                        plugin={formData.plugin}
                        namespace={formData.namespace}
                        count={formData.count}
                        datacenters={formData.datacenters}
                        namespaces={namespaces}
                        onChange={handleInputChange}
                        isLoading={isLoading}
                        isLoadingNamespaces={isLoadingNamespaces}
                    />

                    {/* Private Registry Checkbox */}
                    <div className="mb-4 flex items-center">
                        <input
                            id="usePrivateRegistry"
                            name="usePrivateRegistry"
                            type="checkbox"
                            checked={formData.usePrivateRegistry}
                            onChange={handleCheckboxChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            disabled={isLoading}
                        />
                        <label htmlFor="usePrivateRegistry" className="ml-2 block text-sm font-medium text-gray-700">
                            Use Private Container Registry
                        </label>
                    </div>

                    {/* Private Registry Credentials */}
                    {formData.usePrivateRegistry && (
                        <DockerAuthForm
                            dockerAuth={formData.dockerAuth!}
                            onChange={handleInputChange}
                            isLoading={isLoading}
                        />
                    )}

                    {/* Resources */}
                    <ResourcesForm
                        resources={formData.resources}
                        onChange={handleInputChange}
                        isLoading={isLoading}
                    />

                    {/* Environment Variables */}
                    <EnvironmentVariablesForm
                        envVars={formData.envVars}
                        onEnvVarChange={handleEnvVarChange}
                        onAddEnvVar={addEnvVar}
                        onRemoveEnvVar={removeEnvVar}
                        isLoading={isLoading}
                    />

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
                        <AdvancedSettingsForm
                            count={formData.count}
                            datacenters={formData.datacenters}
                            ports={formData.ports}
                            enablePorts={formData.enablePorts}
                            networkMode={formData.networkMode}
                            enableHealthCheck={formData.enableHealthCheck}
                            healthChecks={formData.healthChecks}
                            onInputChange={handleInputChange}
                            onSelectChange={handleSelectChange}
                            onCheckboxChange={handleCheckboxChange}
                            onPortChange={handlePortChange}
                            onAddPort={addPort}
                            onRemovePort={removePort}
                            onHealthCheckChange={handleHealthCheckChange}
                            isLoading={isLoading}
                        />
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
