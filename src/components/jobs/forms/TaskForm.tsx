// src/components/jobs/forms/TaskForm.tsx
import React, { useState } from 'react';
import { TaskFormData } from '@/types/nomad';
import ResourcesForm from './ResourcesForm';
import EnvironmentVariablesForm from './EnvironmentVariablesForm';
import DockerAuthForm from './DockerAuthForm';

interface TaskFormProps {
    taskIndex: number;
    task: TaskFormData;
    isFirst: boolean;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onEnvVarChange: (varIndex: number, field: 'key' | 'value', value: string) => void;
    onAddEnvVar: () => void;
    onRemoveEnvVar: (varIndex: number) => void;
    onRemoveTask: () => void;
    groupName: string;
    namespace: string;
    isLoading: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({
                                                      taskIndex,
                                                      task,
                                                      isFirst,
                                                      onInputChange,
                                                      onCheckboxChange,
                                                      onEnvVarChange,
                                                      onAddEnvVar,
                                                      onRemoveEnvVar,
                                                      onRemoveTask,
                                                      groupName,
                                                      namespace,
                                                      isLoading
                                                  }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="border rounded-lg p-4 bg-gray-50 relative">
            {/* Header with collapse/expand button */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                        <svg
                            className={`h-5 w-5 transition-transform ${isCollapsed ? '' : 'transform rotate-90'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <h4 className="text-lg font-medium text-gray-900">
                        {task.name || `Container ${taskIndex + 1}`}
                        {isFirst && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Primary</span>}
                    </h4>
                </div>

                {!isFirst && (
                    <button
                        type="button"
                        onClick={onRemoveTask}
                        className="text-red-600 hover:text-red-800 focus:outline-none"
                        disabled={isLoading}
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Collapsed/Expanded content */}
            <div className={`transition-all duration-200 overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0 invisible' : 'max-h-full opacity-100 visible'}`}>
                {/* Task Name */}
                <div className="mb-4">
                    <label htmlFor={`task-${taskIndex}-name`} className="block text-sm font-medium text-gray-700 mb-1">
                        Container Name
                    </label>
                    <input
                        id={`task-${taskIndex}-name`}
                        name="name"
                        type="text"
                        value={task.name}
                        onChange={onInputChange}
                        placeholder={isFirst ? groupName || "main" : `${groupName}-service-${taskIndex + 1}`}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                        required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        A unique name for this container within the task group
                    </p>
                </div>

                {/* Docker Image */}
                <div className="mb-4">
                    <label htmlFor={`task-${taskIndex}-image`} className="block text-sm font-medium text-gray-700 mb-1">
                        Docker Image
                    </label>
                    <input
                        id={`task-${taskIndex}-image`}
                        name="image"
                        type="text"
                        value={task.image}
                        onChange={onInputChange}
                        placeholder="nginx:latest"
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                        required
                    />
                </div>

                {/* Container Runtime */}
                <div className="mb-4">
                    <label htmlFor={`task-${taskIndex}-plugin`} className="block text-sm font-medium text-gray-700 mb-1">
                        Container Runtime
                    </label>
                    <select
                        id={`task-${taskIndex}-plugin`}
                        name="plugin"
                        value={task.plugin}
                        onChange={onInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    >
                        <option value="podman">Podman</option>
                        <option value="docker">Docker</option>
                    </select>
                </div>

                {/* Private Registry Checkbox */}
                <div className="mb-4 flex items-center">
                    <input
                        id={`task-${taskIndex}-usePrivateRegistry`}
                        name="usePrivateRegistry"
                        type="checkbox"
                        checked={task.usePrivateRegistry}
                        onChange={onCheckboxChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={isLoading}
                    />
                    <label htmlFor={`task-${taskIndex}-usePrivateRegistry`} className="ml-2 block text-sm font-medium text-gray-700">
                        Use Private Container Registry
                    </label>
                </div>

                {/* Private Registry Credentials */}
                {task.usePrivateRegistry && (
                    <DockerAuthForm
                        dockerAuth={task.dockerAuth!}
                        onChange={onInputChange}
                        isLoading={isLoading}
                        prefix={`task-${taskIndex}-`}
                    />
                )}

                {/* Resources */}
                <div className="mb-4">
                    <h5 className="text-md font-medium text-gray-700 mb-2">Resources</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* CPU */}
                        <div>
                            <label htmlFor={`task-${taskIndex}-resources.CPU`} className="block text-sm font-medium text-gray-700 mb-1">
                                CPU (MHz)
                            </label>
                            <input
                                id={`task-${taskIndex}-resources.CPU`}
                                name="resources.CPU"
                                type="number"
                                min="100"
                                value={task.resources.CPU}
                                onChange={onInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Memory */}
                        <div>
                            <label htmlFor={`task-${taskIndex}-resources.MemoryMB`} className="block text-sm font-medium text-gray-700 mb-1">
                                Memory (MB)
                            </label>
                            <input
                                id={`task-${taskIndex}-resources.MemoryMB`}
                                name="resources.MemoryMB"
                                type="number"
                                min="32"
                                value={task.resources.MemoryMB}
                                onChange={onInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Disk */}
                        <div>
                            <label htmlFor={`task-${taskIndex}-resources.DiskMB`} className="block text-sm font-medium text-gray-700 mb-1">
                                Disk (MB)
                            </label>
                            <input
                                id={`task-${taskIndex}-resources.DiskMB`}
                                name="resources.DiskMB"
                                type="number"
                                min="10"
                                value={task.resources.DiskMB}
                                onChange={onInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>

                {/* Environment Variables */}
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <h5 className="text-md font-medium text-gray-700">Environment Variables</h5>
                        <button
                            type="button"
                            onClick={onAddEnvVar}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={isLoading}
                        >
                            Add Variable
                        </button>
                    </div>

                    {task.envVars.map((envVar, index) => (
                        <div key={index} className="flex space-x-2 mb-2">
                            <input
                                type="text"
                                value={envVar.key}
                                onChange={(e) => onEnvVarChange(index, 'key', e.target.value)}
                                placeholder="KEY"
                                className="w-1/3 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                            <input
                                type="text"
                                value={envVar.value}
                                onChange={(e) => onEnvVarChange(index, 'value', e.target.value)}
                                placeholder="value"
                                className="w-1/2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => onRemoveEnvVar(index)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                disabled={isLoading}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>

                {/* Communication Info */}
                {!isFirst && (
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700 rounded mb-4">
                        <h5 className="font-semibold text-sm">Container Access Information</h5>
                        <p className="text-xs mt-1">
                            This container can be accessed by other containers in the same task group via:
                        </p>
                        <ul className="text-xs mt-1 ml-4 list-disc">
                            <li>Localhost: <code className="bg-blue-100 px-1 py-0.5 rounded">localhost</code> (All ports are shared within the task group)</li>
                            <li>Service name: <code className="bg-blue-100 px-1 py-0.5 rounded">{task.name}.service.{namespace}.nomad</code></li>
                            <li>Consul DNS: <code className="bg-blue-100 px-1 py-0.5 rounded">{task.name}.service.consul</code> (if Consul is enabled)</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskForm;
