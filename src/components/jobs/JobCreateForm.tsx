// src/components/jobs/JobCreateForm.tsx
'use client';

import React, { useState } from 'react';
import { useJobForm } from '@/hooks/useJobForm';
import BasicJobInfoForm from './forms/BasicJobInfoForm';
import ResourcesForm from './forms/ResourcesForm';
import EnvironmentVariablesForm from './forms/EnvironmentVariablesForm';
import DockerAuthForm from './forms/DockerAuthForm';
import AdvancedSettingsForm from './forms/AdvancedSettingsForm';
import TaskForm from './forms/TaskForm';

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
        handleTaskInputChange,
        handleSelectChange,
        handleCheckboxChange,
        handleTaskCheckboxChange,
        handleEnvVarChange,
        addEnvVar,
        removeEnvVar,
        handlePortChange,
        handlePortTaskChange,
        addPort,
        removePort,
        handleHealthCheckChange,
        addTask,
        removeTask,
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
                        count={formData.count}
                        datacenters={formData.datacenters}
                        namespaces={namespaces}
                        onChange={handleInputChange}
                        isLoading={isLoading}
                        isLoadingNamespaces={isLoadingNamespaces}
                        isNameValid={isNameValid}
                    />

                    {/* Tasks (Containers) */}
                    <div className="mb-6 border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Containers</h3>
                            <button
                                type="button"
                                onClick={addTask}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={isLoading}
                            >
                                Add Container
                            </button>
                        </div>

                        {/* Task Info Block */}
                        <div className="space-y-6">
                            {formData.tasks.map((task, index) => (
                                <TaskForm
                                    key={index}
                                    taskIndex={index}
                                    task={task}
                                    isFirst={index === 0}
                                    onInputChange={(e) => handleTaskInputChange(index, e)}
                                    onCheckboxChange={(e) => handleTaskCheckboxChange(index, e)}
                                    onEnvVarChange={(varIndex, field, value) => handleEnvVarChange(index, varIndex, field, value)}
                                    onAddEnvVar={() => addEnvVar(index)}
                                    onRemoveEnvVar={(varIndex) => removeEnvVar(index, varIndex)}
                                    onRemoveTask={() => removeTask(index)}
                                    groupName={formData.name}
                                    namespace={formData.namespace}
                                    isLoading={isLoading}
                                />
                            ))}
                        </div>

                        {formData.tasks.length > 1 && (
                            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700 rounded">
                                <h4 className="font-medium">Container Communication</h4>
                                <p className="text-sm mt-1">
                                    Containers within the same Task Group can communicate with each other via localhost or through service discovery.
                                </p>
                                <ul className="text-sm mt-2 list-disc list-inside">
                                    <li>For direct communication: <code className="bg-blue-100 px-1 py-0.5 rounded">localhost:<em>port</em></code></li>
                                    <li>Through service discovery with Nomad: <code className="bg-blue-100 px-1 py-0.5 rounded">[task-name].service.[namespace].nomad</code></li>
                                    {formData.serviceProvider === 'consul' && (
                                        <li>Through service discovery with Consul: <code className="bg-blue-100 px-1 py-0.5 rounded">[task-name].service.[namespace].consul</code></li>
                                    )}
                                    <li>Example: <code className="bg-blue-100 px-1 py-0.5 rounded">{formData.tasks[1]?.name || 'db'}.service.{formData.namespace}.{formData.serviceProvider || 'nomad'}</code></li>
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Network and Ports Configuration */}
                    <div className="mb-6 border-t pt-4">
                        <div className="flex items-center mb-2">
                            <input
                                id="enablePorts"
                                name="enablePorts"
                                type="checkbox"
                                checked={formData.enablePorts}
                                onChange={handleCheckboxChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                disabled={isLoading}
                            />
                            <label htmlFor="enablePorts" className="ml-2 block text-md font-medium text-gray-700">
                                Enable Network & Port Configuration
                            </label>
                        </div>

                        {formData.enablePorts && (
                            <div className="border p-4 rounded-md bg-white">
                                <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700 rounded">
                                    <h5 className="font-medium">Group Network Configuration</h5>
                                    <p className="text-sm mt-1">
                                        Network settings are applied to the entire task group. All containers in this group will share the same network mode.
                                    </p>
                                </div>

                                {/* Network Mode Selection */}
                                <div className="mb-4">
                                    <label htmlFor="networkMode" className="block text-sm font-medium text-gray-700 mb-1">
                                        Network Mode
                                    </label>
                                    <select
                                        id="networkMode"
                                        name="networkMode"
                                        value={formData.networkMode}
                                        onChange={handleSelectChange}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isLoading}
                                    >
                                        <option value="host">Host</option>
                                        <option value="bridge">Bridge</option>
                                        <option value="none">None</option>
                                    </select>
                                </div>

                                {/* Service Provider Selection */}
                                <div className="mb-4">
                                    <label htmlFor="serviceProvider" className="block text-sm font-medium text-gray-700 mb-1">
                                        Service Registration Provider
                                    </label>
                                    <select
                                        id="serviceProvider"
                                        name="serviceProvider"
                                        value={formData.serviceProvider || 'nomad'}
                                        onChange={handleSelectChange}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isLoading}
                                    >
                                        <option value="nomad">Nomad</option>
                                        <option value="consul">Consul</option>
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">
                                        All services within a single task group must utilize the same provider.
                                    </p>
                                </div>

                                {/* Ports Configuration */}
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-md font-medium text-gray-700">Ports</h4>
                                        <button
                                            type="button"
                                            onClick={addPort}
                                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            disabled={isLoading}
                                        >
                                            Add Port
                                        </button>
                                    </div>

                                    {formData.ports.map((port, index) => (
                                        <div key={index} className="flex flex-wrap space-x-2 mb-2 p-2 border rounded-md bg-white">
                                            <div className="w-full md:w-auto mb-2 md:mb-0">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Container</label>
                                                <select
                                                    value={port.taskName || ''}
                                                    onChange={(e) => handlePortTaskChange(index, e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isLoading}
                                                >
                                                    <option value="">All containers</option>
                                                    {formData.tasks.map((task, taskIndex) => (
                                                        <option key={taskIndex} value={task.name}>
                                                            {task.name || `Container ${taskIndex + 1}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="w-full md:w-auto mb-2 md:mb-0">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                                                <input
                                                    type="text"
                                                    value={port.label}
                                                    onChange={(e) => handlePortChange(index, 'label', e.target.value)}
                                                    placeholder="http"
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            <div className="w-full md:w-auto mb-2 md:mb-0">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Port</label>
                                                <input
                                                    type="number"
                                                    value={port.value}
                                                    onChange={(e) => handlePortChange(index, 'value', e.target.value)}
                                                    placeholder="8080"
                                                    min="1"
                                                    max="65535"
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            <div className="w-full md:w-auto mb-2 md:mb-0">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">To (inside container)</label>
                                                <input
                                                    type="number"
                                                    value={port.to}
                                                    onChange={(e) => handlePortChange(index, 'to', e.target.value)}
                                                    placeholder="8080"
                                                    min="1"
                                                    max="65535"
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            <div className="w-full md:w-auto mb-2 md:mb-0">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Static Port</label>
                                                <select
                                                    value={port.static ? 'true' : 'false'}
                                                    onChange={(e) => handlePortChange(index, 'static', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isLoading}
                                                >
                                                    <option value="false">Dynamic</option>
                                                    <option value="true">Static</option>
                                                </select>
                                            </div>

                                            <div className="w-full md:w-auto flex items-end">
                                                <button
                                                    type="button"
                                                    onClick={() => removePort(index)}
                                                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                    disabled={isLoading || formData.ports.length <= 1}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Health Check Configuration */}
                    <div className="mb-6 border-t pt-4">
                        <div className="flex items-center mb-2">
                            <input
                                id="enableHealthCheck"
                                name="enableHealthCheck"
                                type="checkbox"
                                checked={formData.enableHealthCheck}
                                onChange={handleCheckboxChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                disabled={isLoading}
                            />
                            <label htmlFor="enableHealthCheck" className="ml-2 block text-md font-medium text-gray-700">
                                Enable Health Check
                            </label>
                        </div>

                        {formData.enableHealthCheck && (
                            <div className="border p-4 rounded-md bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Health Check Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Check Type
                                        </label>
                                        <select
                                            value={formData.healthChecks[0].type}
                                            onChange={(e) => handleHealthCheckChange('type', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            disabled={isLoading}
                                        >
                                            <option value="http">HTTP</option>
                                            <option value="tcp">TCP</option>
                                            <option value="script">Script</option>
                                        </select>
                                    </div>

                                    {/* Path (for HTTP) */}
                                    {formData.healthChecks[0].type === 'http' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                HTTP Path
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.healthChecks[0].path || ''}
                                                onChange={(e) => handleHealthCheckChange('path', e.target.value)}
                                                placeholder="/health"
                                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    )}

                                    {/* Command (for Script) */}
                                    {formData.healthChecks[0].type === 'script' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Script Command
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.healthChecks[0].command || ''}
                                                onChange={(e) => handleHealthCheckChange('command', e.target.value)}
                                                placeholder="/bin/check-health.sh"
                                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    )}

                                    {/* Other health check fields */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Check Interval (seconds)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.healthChecks[0].interval}
                                            onChange={(e) => handleHealthCheckChange('interval', e.target.value)}
                                            min="1"
                                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            disabled={isLoading}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Timeout (seconds)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.healthChecks[0].timeout}
                                            onChange={(e) => handleHealthCheckChange('timeout', e.target.value)}
                                            min="1"
                                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
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

                            {/* Task Count */}
                            <div className="mb-4">
                                <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                                    Task Count (Replicas)
                                </label>
                                <input
                                    id="count"
                                    name="count"
                                    type="number"
                                    min="1"
                                    value={formData.count}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Number of instances of this job to run
                                </p>
                            </div>

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
