// src/components/jobs/JobEditForm.tsx
'use client';

import React, { useState } from 'react';
import { useJobEditForm } from '@/hooks/useJobEditForm';
import BasicJobInfoForm from './forms/BasicJobInfoForm';
import TaskForm from './forms/TaskForm';
import Link from 'next/link';

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

                    {/* Tasks (Containers) */}
                    <div className="mb-6 border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Containers</h3>
                            <button
                                type="button"
                                onClick={addTask}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={isSaving}
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
                                    isLoading={isSaving}
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
                                    <li>Through service discovery: <code className="bg-blue-100 px-1 py-0.5 rounded">[task-name].service.[namespace].consul</code></li>
                                    <li>Example: <code className="bg-blue-100 px-1 py-0.5 rounded">{formData.tasks[1]?.name || 'db'}.service.{formData.namespace}.consul</code></li>
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
                                disabled={isSaving}
                            />
                            <label htmlFor="enablePorts" className="ml-2 block text-md font-medium text-gray-700">
                                Enable Network & Port Configuration
                            </label>
                        </div>

                        {formData.enablePorts && (
                            <div className="border p-4 rounded-md bg-white">
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
                                        disabled={isSaving}
                                    >
                                        <option value="host">Host</option>
                                        <option value="bridge">Bridge</option>
                                        <option value="none">None</option>
                                    </select>
                                </div>

                                {/* Ports Configuration */}
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-md font-medium text-gray-700">Ports</h4>
                                        <button
                                            type="button"
                                            onClick={addPort}
                                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            disabled={isSaving}
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
                                                    disabled={isSaving}
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
                                                    disabled={isSaving}
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
                                                    disabled={isSaving}
                                                />
                                            </div>

                                            <div className="w-full md:w-auto mb-2 md:mb-0">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Static Port</label>
                                                <select
                                                    value={port.static ? 'true' : 'false'}
                                                    onChange={(e) => handlePortChange(index, 'static', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isSaving}
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
                                                    disabled={isSaving || formData.ports.length <= 1}
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
                                disabled={isSaving}
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
                                            disabled={isSaving}
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
                                                disabled={isSaving}
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
                                                disabled={isSaving}
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
                                            disabled={isSaving}
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
                                            disabled={isSaving}
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
                                    disabled={isSaving}
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
