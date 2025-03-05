// src/components/jobs/forms/TaskGroupForm.tsx
import React, { useState } from 'react';
import { NomadEnvVar, NomadPort, NomadHealthCheck } from '@/types/nomad';
import { Eye, EyeOff, Trash, Plus, ChevronRight } from 'lucide-react';

interface TaskGroupFormProps {
    groupIndex: number;
    group: {
        name: string;
        count: number;
        image: string;
        plugin: string;
        resources: {
            CPU: number;
            MemoryMB: number;
            DiskMB: number;
        };
        envVars: NomadEnvVar[];
        usePrivateRegistry: boolean;
        dockerAuth?: {
            username: string;
            password: string;
        };
        enableNetwork: boolean;
        networkMode: 'none' | 'host' | 'bridge';
        ports: NomadPort[];
        enableHealthCheck: boolean;
        healthCheck?: NomadHealthCheck;
    };
    isFirst: boolean;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onEnvVarChange: (varIndex: number, field: 'key' | 'value', value: string) => void;
    onAddEnvVar: () => void;
    onRemoveEnvVar: (varIndex: number) => void;
    onPortChange: (portIndex: number, field: keyof NomadPort, value: string) => void;
    onAddPort: () => void;
    onRemovePort: (portIndex: number) => void;
    onHealthCheckChange: (field: keyof NomadHealthCheck, value: string | number) => void;
    onRemoveGroup: () => void;
    jobName: string;
    namespace: string;
    isLoading: boolean;
}

export const TaskGroupForm: React.FC<TaskGroupFormProps> = ({
                                                                groupIndex,
                                                                group,
                                                                isFirst,
                                                                onInputChange,
                                                                onCheckboxChange,
                                                                onEnvVarChange,
                                                                onAddEnvVar,
                                                                onRemoveEnvVar,
                                                                onPortChange,
                                                                onAddPort,
                                                                onRemovePort,
                                                                onHealthCheckChange,
                                                                onRemoveGroup,
                                                                jobName,
                                                                namespace,
                                                                isLoading
                                                            }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    // Track which environment variables have visible values
    const [visibleEnvValues, setVisibleEnvValues] = useState<Record<number, boolean>>({});

    // Toggle visibility for a specific env var
    const toggleEnvValueVisibility = (index: number) => {
        setVisibleEnvValues(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

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
                        <ChevronRight
                            className={`h-5 w-5 transition-transform ${isCollapsed ? '' : 'transform rotate-90'}`}
                        />
                    </button>
                    <h4 className="text-lg font-medium text-gray-900">
                        {group.name || `Group ${groupIndex + 1}`}
                        {isFirst && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Primary</span>}
                    </h4>
                </div>

                {!isFirst && (
                    <button
                        type="button"
                        onClick={onRemoveGroup}
                        className="text-red-600 hover:text-red-800 focus:outline-none"
                        disabled={isLoading}
                    >
                        <Trash className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Collapsed/Expanded content */}
            <div className={`transition-all duration-200 overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0 invisible' : 'max-h-full opacity-100 visible'}`}>
                {/* Group Name */}
                <div className="mb-4">
                    <label htmlFor={`group-${groupIndex}-name`} className="block text-sm font-medium text-gray-700 mb-1">
                        Group Name
                    </label>
                    <input
                        id={`group-${groupIndex}-name`}
                        name="name"
                        type="text"
                        value={group.name}
                        onChange={onInputChange}
                        placeholder={isFirst ? jobName || "main" : `${jobName}-group-${groupIndex + 1}`}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                        required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        A unique name for this task group. This name will be used for service discovery.
                    </p>
                </div>

                {/* Group Count (Replicas) */}
                <div className="mb-4">
                    <label htmlFor={`group-${groupIndex}-count`} className="block text-sm font-medium text-gray-700 mb-1">
                        Count (Replicas)
                    </label>
                    <input
                        id={`group-${groupIndex}-count`}
                        name="count"
                        type="number"
                        min="1"
                        value={group.count}
                        onChange={onInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Number of instances to run of this task group
                    </p>
                </div>

                {/* Docker Image */}
                <div className="mb-4">
                    <label htmlFor={`group-${groupIndex}-image`} className="block text-sm font-medium text-gray-700 mb-1">
                        Docker Image
                    </label>
                    <input
                        id={`group-${groupIndex}-image`}
                        name="image"
                        type="text"
                        value={group.image}
                        onChange={onInputChange}
                        placeholder="nginx:latest"
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                        required
                    />
                </div>

                {/* Private Registry Checkbox */}
                <div className="mb-4 flex items-center">
                    <input
                        id={`group-${groupIndex}-usePrivateRegistry`}
                        name="usePrivateRegistry"
                        type="checkbox"
                        checked={group.usePrivateRegistry}
                        onChange={onCheckboxChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={isLoading}
                    />
                    <label htmlFor={`group-${groupIndex}-usePrivateRegistry`} className="ml-2 block text-sm font-medium text-gray-700">
                        Use Private Container Registry
                    </label>
                </div>

                {/* Private Registry Credentials */}
                {group.usePrivateRegistry && (
                    <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                        <h4 className="text-md font-medium text-gray-700 mb-3">Registry Credentials</h4>

                        {/* Username */}
                        <div className="mb-3">
                            <label htmlFor={`group-${groupIndex}-dockerAuth.username`} className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <input
                                id={`group-${groupIndex}-dockerAuth.username`}
                                name="dockerAuth.username"
                                type="text"
                                value={group.dockerAuth?.username || ''}
                                onChange={onInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="mb-3 relative">
                            <label htmlFor={`group-${groupIndex}-dockerAuth.password`} className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id={`group-${groupIndex}-dockerAuth.password`}
                                    name="dockerAuth.password"
                                    type="password"
                                    value={group.dockerAuth?.password || ''}
                                    onChange={onInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Container Runtime */}
                <div className="mb-4">
                    <label htmlFor={`group-${groupIndex}-plugin`} className="block text-sm font-medium text-gray-700 mb-1">
                        Container Runtime
                    </label>
                    <select
                        id={`group-${groupIndex}-plugin`}
                        name="plugin"
                        value={group.plugin}
                        onChange={onInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    >
                        <option value="podman">Podman</option>
                        <option value="docker">Docker</option>
                    </select>
                </div>

                {/* Resources */}
                <div className="mb-4">
                    <h5 className="text-md font-medium text-gray-700 mb-2">Resources</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* CPU */}
                        <div>
                            <label htmlFor={`group-${groupIndex}-resources.CPU`} className="block text-sm font-medium text-gray-700 mb-1">
                                CPU (MHz)
                            </label>
                            <input
                                id={`group-${groupIndex}-resources.CPU`}
                                name="resources.CPU"
                                type="number"
                                min="100"
                                value={group.resources.CPU}
                                onChange={onInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Memory */}
                        <div>
                            <label htmlFor={`group-${groupIndex}-resources.MemoryMB`} className="block text-sm font-medium text-gray-700 mb-1">
                                Memory (MB)
                            </label>
                            <input
                                id={`group-${groupIndex}-resources.MemoryMB`}
                                name="resources.MemoryMB"
                                type="number"
                                min="32"
                                value={group.resources.MemoryMB}
                                onChange={onInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Disk */}
                        <div>
                            <label htmlFor={`group-${groupIndex}-resources.DiskMB`} className="block text-sm font-medium text-gray-700 mb-1">
                                Disk (MB)
                            </label>
                            <input
                                id={`group-${groupIndex}-resources.DiskMB`}
                                name="resources.DiskMB"
                                type="number"
                                min="10"
                                value={group.resources.DiskMB}
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
                    </div>

                    {group.envVars.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">No environment variables defined. Click "Add Variable" to add one.</div>
                    ) : (
                        group.envVars.map((envVar, index) => (
                            <div key={index} className="flex space-x-2 mb-2 items-center">
                                <input
                                    type="text"
                                    value={envVar.key}
                                    onChange={(e) => onEnvVarChange(index, 'key', e.target.value)}
                                    placeholder="KEY"
                                    className="w-1/3 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                <div className="relative w-1/2">
                                    <input
                                        type={visibleEnvValues[index] ? "text" : "password"}
                                        value={envVar.value}
                                        onChange={(e) => onEnvVarChange(index, 'value', e.target.value)}
                                        placeholder="value"
                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toggleEnvValueVisibility(index)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                        disabled={isLoading}
                                    >
                                        {visibleEnvValues[index] ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {group.envVars.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => onRemoveEnvVar(index)}
                                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        disabled={isLoading}
                                    >
                                        <Trash size={16} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onAddEnvVar}
                                    className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                >
                                    Add
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Network Configuration */}
                <div className="mb-4">
                    <div className="flex items-center mb-2">
                        <input
                            id={`group-${groupIndex}-enableNetwork`}
                            name="enableNetwork"
                            type="checkbox"
                            checked={group.enableNetwork}
                            onChange={onCheckboxChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            disabled={isLoading}
                        />
                        <label htmlFor={`group-${groupIndex}-enableNetwork`} className="ml-2 block text-md font-medium text-gray-700">
                            Enable Network Configuration
                        </label>
                    </div>

                    {group.enableNetwork && (
                        <div className="border p-4 rounded-md bg-white">
                            <div className="mb-4">
                                <label htmlFor={`group-${groupIndex}-networkMode`} className="block text-sm font-medium text-gray-700 mb-1">
                                    Network Mode
                                </label>
                                <select
                                    id={`group-${groupIndex}-networkMode`}
                                    name="networkMode"
                                    value={group.networkMode}
                                    onChange={onInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                >
                                    <option value="bridge">Bridge</option>
                                    <option value="host">Host</option>
                                    <option value="none">None</option>
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    Select the container network mode. 'Bridge' is recommended for service discovery.
                                </p>
                            </div>

                            {/* Ports Configuration */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h6 className="text-sm font-medium text-gray-700">Ports</h6>
                                    <button
                                        type="button"
                                        onClick={onAddPort}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        disabled={isLoading}
                                    >
                                        <Plus size={14} className="mr-1" /> Add Port
                                    </button>
                                </div>

                                {group.ports.length === 0 ? (
                                    <div className="text-sm text-gray-500 italic">No ports defined. Click "Add Port" to add one.</div>
                                ) : (
                                    group.ports.map((port, index) => (
                                        <div key={index} className="flex flex-wrap items-end gap-2 mb-2 p-2 border rounded-md bg-white">
                                            <div className="w-full md:w-auto">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                                                <input
                                                    type="text"
                                                    value={port.label}
                                                    onChange={(e) => onPortChange(index, 'label', e.target.value)}
                                                    placeholder="http"
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            <div className="w-full md:w-auto">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Port Type</label>
                                                <select
                                                    value={port.static ? 'true' : 'false'}
                                                    onChange={(e) => onPortChange(index, 'static', e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isLoading}
                                                >
                                                    <option value="false">Dynamic</option>
                                                    <option value="true">Static</option>
                                                </select>
                                            </div>

                                            {port.static && (
                                                <div className="w-full md:w-auto">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Host Port</label>
                                                    <input
                                                        type="number"
                                                        value={port.value}
                                                        onChange={(e) => onPortChange(index, 'value', e.target.value)}
                                                        placeholder="8080"
                                                        min="1"
                                                        max="65535"
                                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            )}

                                            <div className="w-full md:w-auto">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Container Port</label>
                                                <input
                                                    type="number"
                                                    value={port.to}
                                                    onChange={(e) => onPortChange(index, 'to', e.target.value)}
                                                    placeholder="8080"
                                                    min="1"
                                                    max="65535"
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            {group.ports.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => onRemovePort(index)}
                                                    className="px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                    disabled={isLoading}
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Health Check Configuration */}
                <div className="mb-4">
                    <div className="flex items-center mb-2">
                        <input
                            id={`group-${groupIndex}-enableHealthCheck`}
                            name="enableHealthCheck"
                            type="checkbox"
                            checked={group.enableHealthCheck}
                            onChange={onCheckboxChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            disabled={isLoading}
                        />
                        <label htmlFor={`group-${groupIndex}-enableHealthCheck`} className="ml-2 block text-md font-medium text-gray-700">
                            Enable Health Check
                        </label>
                    </div>

                    {group.enableHealthCheck && group.healthCheck && (
                        <div className="border p-4 rounded-md bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Health Check Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Check Type
                                    </label>
                                    <select
                                        value={group.healthCheck.type}
                                        onChange={(e) => onHealthCheckChange('type', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isLoading}
                                    >
                                        <option value="http">HTTP</option>
                                        <option value="tcp">TCP</option>
                                        <option value="script">Script</option>
                                    </select>
                                </div>

                                {/* Path (for HTTP) */}
                                {group.healthCheck.type === 'http' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            HTTP Path
                                        </label>
                                        <input
                                            type="text"
                                            value={group.healthCheck.path || ''}
                                            onChange={(e) => onHealthCheckChange('path', e.target.value)}
                                            placeholder="/health"
                                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            disabled={isLoading}
                                        />
                                    </div>
                                )}

                                {/* Command (for Script) */}
                                {group.healthCheck.type === 'script' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Script Command
                                        </label>
                                        <input
                                            type="text"
                                            value={group.healthCheck.command || ''}
                                            onChange={(e) => onHealthCheckChange('command', e.target.value)}
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
                                        value={group.healthCheck.interval}
                                        onChange={(e) => onHealthCheckChange('interval', e.target.value)}
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
                                        value={group.healthCheck.timeout}
                                        onChange={(e) => onHealthCheckChange('timeout', e.target.value)}
                                        min="1"
                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Nomad Environment Variables Information */}
                <div className="p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700 rounded mb-4">
                    <h5 className="font-semibold text-sm">Nomad Runtime Environment Variables</h5>
                    <p className="text-xs mt-1">
                        Nomad injects these variables inside the container at runtime:
                    </p>
                    <ul className="text-xs mt-1 ml-4 list-disc">
                        <li>General: <code className="bg-blue-100 px-1 py-0.5 rounded">NOMAD_ALLOC_ID</code> - Allocation ID</li>
                        <li>Network: <code className="bg-blue-100 px-1 py-0.5 rounded">NOMAD_PORT_<em>label</em></code> - Port values</li>
                        <li>Network: <code className="bg-blue-100 px-1 py-0.5 rounded">NOMAD_ADDR_<em>label</em></code> - IP:port for service ports</li>
                        <li>Tasks: <code className="bg-blue-100 px-1 py-0.5 rounded">NOMAD_TASK_NAME</code> - Name of the task</li>
                    </ul>
                    <p className="text-xs mt-2">
                        To see all variables: add a command like <code className="bg-blue-100 px-1 py-0.5 rounded">env | grep NOMAD</code> to your container
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TaskGroupForm;
