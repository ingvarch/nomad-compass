// src/components/jobs/JobCreateForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import { NomadEnvVar, NomadJobFormData, NomadPort, NomadHealthCheck } from '@/types/nomad';

export const JobCreateForm: React.FC = () => {
    const router = useRouter();
    const { token, nomadAddr } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [namespaces, setNamespaces] = useState<string[]>(['default']);
    const [isLoadingNamespaces, setIsLoadingNamespaces] = useState(true);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    // Default form values
    const [formData, setFormData] = useState<NomadJobFormData>({
        name: '',
        image: '',
        plugin: 'podman',
        namespace: 'default',
        resources: {
            CPU: 100,
            MemoryMB: 256,
            DiskMB: 500,
        },
        envVars: [{ key: '', value: '' }],
        // Advanced settings
        ports: [{ label: 'http', value: 8080, to: 8080, static: false }],
        healthChecks: [{
            type: 'http',
            path: '/health',
            interval: 30,
            timeout: 5,
            initialDelay: 5,
            failuresBeforeUnhealthy: 3,
            successesBeforeHealthy: 2
        }],
        enableHealthCheck: false,
        count: 1,
        datacenters: ['dc1'],
        usePrivateRegistry: false,
        dockerAuth: {
            username: '',
            password: ''
        }
    });

    // Fetch available namespaces
    useEffect(() => {
        const fetchNamespaces = async () => {
            if (!token || !nomadAddr) {
                setIsLoadingNamespaces(false);
                return;
            }

            try {
                const client = createNomadClient(nomadAddr, token);
                const response = await client.getNamespaces();

                if (response && Array.isArray(response)) {
                    const nsNames = response.map(ns => ns.Name);
                    setNamespaces(nsNames.length > 0 ? nsNames : ['default']);
                }
            } catch (err) {
                console.error('Failed to fetch namespaces:', err);
                // Fallback to default namespace if fetching fails
                setNamespaces(['default']);
            } finally {
                setIsLoadingNamespaces(false);
            }
        };

        fetchNamespaces();
    }, [token, nomadAddr]);

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const newValue = type === 'number' ? Number(value) : value;

        if (name.startsWith('resources.')) {
            const resourceField = name.split('.')[1];
            setFormData({
                ...formData,
                resources: {
                    ...formData.resources,
                    [resourceField]: parseInt(value, 10)
                }
            });
        } else if (name === 'datacenters') {
            // Split comma-separated datacenters into an array
            setFormData({
                ...formData,
                datacenters: value.split(',').map(dc => dc.trim())
            });
        } else if (name.startsWith('dockerAuth.')) {
            const field = name.split('.')[1];
            setFormData({
                ...formData,
                dockerAuth: {
                    ...formData.dockerAuth!,
                    [field]: value
                }
            });
        } else {
            setFormData({
                ...formData,
                [name]: newValue
            });
        }
    };

    // Toggle checkbox
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData({
            ...formData,
            [name]: checked
        });
    };

    // Handle environment variable changes
    const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
        const updatedEnvVars = [...formData.envVars];
        updatedEnvVars[index] = {
            ...updatedEnvVars[index],
            [field]: value
        };

        setFormData({
            ...formData,
            envVars: updatedEnvVars
        });
    };

    // Add a new environment variable field
    const addEnvVar = () => {
        setFormData({
            ...formData,
            envVars: [...formData.envVars, { key: '', value: '' }]
        });
    };

    // Remove an environment variable field
    const removeEnvVar = (index: number) => {
        if (formData.envVars.length <= 1) return;

        const updatedEnvVars = [...formData.envVars];
        updatedEnvVars.splice(index, 1);

        setFormData({
            ...formData,
            envVars: updatedEnvVars
        });
    };

    // Handle port changes
    const handlePortChange = (index: number, field: keyof NomadPort, value: string) => {
        const updatedPorts = [...formData.ports];

        if (field === 'static') {
            updatedPorts[index] = {
                ...updatedPorts[index],
                [field]: value === 'true'
            };
        } else if (field === 'label') {
            updatedPorts[index] = {
                ...updatedPorts[index],
                [field]: value
            };
        } else {
            updatedPorts[index] = {
                ...updatedPorts[index],
                [field]: parseInt(value, 10) || 0
            };
        }

        setFormData({
            ...formData,
            ports: updatedPorts
        });
    };

    // Add a new port field
    const addPort = () => {
        setFormData({
            ...formData,
            ports: [...formData.ports, { label: '', value: 0, to: 0, static: false }]
        });
    };

    // Remove a port field
    const removePort = (index: number) => {
        if (formData.ports.length <= 1) return;

        const updatedPorts = [...formData.ports];
        updatedPorts.splice(index, 1);

        setFormData({
            ...formData,
            ports: updatedPorts
        });
    };

    // Handle health check changes
    const handleHealthCheckChange = (field: keyof NomadHealthCheck, value: string | number) => {
        // There is only one health check so index is always 0
        const updatedHealthChecks = [...formData.healthChecks];

        if (field === 'type') {
            updatedHealthChecks[0] = {
                ...updatedHealthChecks[0],
                [field]: value as 'http' | 'tcp' | 'script'
            };
        } else {
            updatedHealthChecks[0] = {
                ...updatedHealthChecks[0],
                [field]: typeof value === 'string' ? value : parseInt(String(value), 10) || 0
            };
        }

        setFormData({
            ...formData,
            healthChecks: updatedHealthChecks
        });
    };

    // Create Nomad job specification from form data
    const createJobSpec = () => {
        // Convert environment variables to the format expected by Nomad
        const env: Record<string, string> = {};
        formData.envVars.forEach((envVar) => {
            if (envVar.key.trim() !== '') {
                env[envVar.key] = envVar.value;
            }
        });

        // Prepare network configuration with ports
        const network = {
            Mode: 'host',
            DynamicPorts: [] as Array<{Label: string, To: number}>,
            ReservedPorts: [] as Array<{Label: string, Value: number, To?: number}>
        };

        // Process ports configuration
        formData.ports.forEach(port => {
            if (port.label.trim() === '') return;

            if (port.static) {
                network.ReservedPorts.push({
                    Label: port.label,
                    Value: port.value,
                    ...(port.to && port.to !== port.value ? {To: port.to} : {})
                });
            } else {
                network.DynamicPorts.push({
                    Label: port.label,
                    To: port.to || port.value
                });
            }
        });

        // Prepare services with health checks if enabled
        const services = formData.enableHealthCheck ? formData.healthChecks.map(check => {
            const healthCheck = {
                Name: `${formData.name}-health`,
                PortLabel: formData.ports.length > 0 ? formData.ports[0].label : 'http',
                Checks: [{
                    Type: check.type,
                    ...(check.type === 'http' ? {Path: check.path} : {}),
                    ...(check.type === 'script' ? {Command: check.command} : {}),
                    Interval: check.interval * 1000000000, // Convert to nanoseconds
                    Timeout: check.timeout * 1000000000, // Convert to nanoseconds
                    CheckRestart: {
                        Limit: 3,
                        Grace: (check.initialDelay || 5) * 1000000000,
                        IgnoreWarnings: false
                    }
                }]
            };
            return healthCheck;
        }) : [];

        // Base task configuration
        const taskConfig: any = {
            image: formData.image,
            ports: formData.ports.map(p => p.label).filter(label => label.trim() !== ''),
        };

        // DockerAuth for private registry
        if (formData.usePrivateRegistry && formData.dockerAuth) {
            taskConfig.auth = {
                username: formData.dockerAuth.username,
                password: formData.dockerAuth.password
            };
        }

        // Basic job template for Nomad
        return {
            Job: {
                ID: formData.name,
                Name: formData.name,
                Namespace: formData.namespace,
                Type: 'service',
                Datacenters: formData.datacenters,
                TaskGroups: [
                    {
                        Name: formData.name,
                        Count: formData.count,
                        Networks: [network],
                        Services: services,
                        Tasks: [
                            {
                                Name: formData.name,
                                Driver: formData.plugin,
                                Config: taskConfig,
                                Env: env,
                                Resources: {
                                    CPU: formData.resources.CPU,
                                    MemoryMB: formData.resources.MemoryMB,
                                    DiskMB: formData.resources.DiskMB
                                }
                            }
                        ]
                    }
                ]
            }
        };
    };

    // Submit form to create job
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        try {
            if (!token || !nomadAddr) {
                throw new Error('Authentication required');
            }

            // Validate form data
            if (!formData.name.trim()) {
                throw new Error('Job name is required');
            }

            if (!formData.image.trim()) {
                throw new Error('Docker image is required');
            }

            if (formData.usePrivateRegistry) {
                if (!formData.dockerAuth?.username) {
                    throw new Error('Username is required for private registry');
                }
                if (!formData.dockerAuth?.password) {
                    throw new Error('Password is required for private registry');
                }
            }

            // Create job spec from form data
            const jobSpec = createJobSpec();
            console.log('Job spec:', JSON.stringify(jobSpec, null, 2));

            // Submit job to Nomad
            const client = createNomadClient(nomadAddr, token);
            const response = await client.createJob(jobSpec);

            setSuccess(`Job "${formData.name}" created successfully in namespace "${formData.namespace}"!`);

            // Reset form after successful submission
            setTimeout(() => {
                router.push('/jobs');
            }, 2000);
        } catch (err) {
            console.error('Failed to create job:', err);
            setError(typeof err === 'object' && err !== null && 'message' in err
                ? (err as Error).message
                : 'Failed to create job. Please check your inputs and try again.');
        } finally {
            setIsLoading(false);
        }
    };

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
                    {/* Job Name */}
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Job Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="my-service"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                            required
                        />
                    </div>

                    {/* Namespace Selector */}
                    <div className="mb-4">
                        <label htmlFor="namespace" className="block text-sm font-medium text-gray-700 mb-1">
                            Namespace
                        </label>
                        <select
                            id="namespace"
                            name="namespace"
                            value={formData.namespace}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading || isLoadingNamespaces}
                        >
                            {isLoadingNamespaces ? (
                                <option value="default">Loading namespaces...</option>
                            ) : (
                                namespaces.map(ns => (
                                    <option key={ns} value={ns}>{ns}</option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Docker Image */}
                    <div className="mb-4">
                        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                            Docker Image
                        </label>
                        <input
                            id="image"
                            name="image"
                            type="text"
                            value={formData.image}
                            onChange={handleInputChange}
                            placeholder="nginx:latest"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                            required
                        />
                    </div>

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
                        <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                            <h4 className="text-md font-medium text-gray-700 mb-3">Registry Credentials</h4>

                            {/* Username */}
                            <div className="mb-3">
                                <label htmlFor="dockerAuth.username" className="block text-sm font-medium text-gray-700 mb-1">
                                    Username
                                </label>
                                <input
                                    id="dockerAuth.username"
                                    name="dockerAuth.username"
                                    type="text"
                                    value={formData.dockerAuth?.username || ''}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                    required={formData.usePrivateRegistry}
                                />
                            </div>

                            {/* Password */}
                            <div className="mb-3">
                                <label htmlFor="dockerAuth.password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    id="dockerAuth.password"
                                    name="dockerAuth.password"
                                    type="password"
                                    value={formData.dockerAuth?.password || ''}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                    required={formData.usePrivateRegistry}
                                />
                            </div>
                        </div>
                    )}

                    {/* Container Runtime */}
                    <div className="mb-4">
                        <label htmlFor="plugin" className="block text-sm font-medium text-gray-700 mb-1">
                            Container Runtime
                        </label>
                        <select
                            id="plugin"
                            name="plugin"
                            value={formData.plugin}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        >
                            <option value="podman">Podman</option>
                            <option value="docker">Docker</option>
                        </select>
                    </div>

                    {/* Resources */}
                    <div className="mb-4">
                        <h3 className="text-md font-medium text-gray-700 mb-2">Resources</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* CPU */}
                            <div>
                                <label htmlFor="resources.CPU" className="block text-sm font-medium text-gray-700 mb-1">
                                    CPU (MHz)
                                </label>
                                <input
                                    id="resources.CPU"
                                    name="resources.CPU"
                                    type="number"
                                    min="100"
                                    value={formData.resources.CPU}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Memory */}
                            <div>
                                <label htmlFor="resources.MemoryMB" className="block text-sm font-medium text-gray-700 mb-1">
                                    Memory (MB)
                                </label>
                                <input
                                    id="resources.MemoryMB"
                                    name="resources.MemoryMB"
                                    type="number"
                                    min="32"
                                    value={formData.resources.MemoryMB}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Disk */}
                            <div>
                                <label htmlFor="resources.DiskMB" className="block text-sm font-medium text-gray-700 mb-1">
                                    Disk (MB)
                                </label>
                                <input
                                    id="resources.DiskMB"
                                    name="resources.DiskMB"
                                    type="number"
                                    min="10"
                                    value={formData.resources.DiskMB}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Environment Variables */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-md font-medium text-gray-700">Environment Variables</h3>
                            <button
                                type="button"
                                onClick={addEnvVar}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={isLoading}
                            >
                                Add Variable
                            </button>
                        </div>

                        {formData.envVars.map((envVar, index) => (
                            <div key={index} className="flex space-x-2 mb-2">
                                <input
                                    type="text"
                                    value={envVar.key}
                                    onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
                                    placeholder="KEY"
                                    className="w-1/3 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                <input
                                    type="text"
                                    value={envVar.value}
                                    onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                                    placeholder="value"
                                    className="w-1/2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeEnvVar(index)}
                                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    disabled={isLoading || formData.envVars.length <= 1}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
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
                                    Task Count
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

                            {/* Port Configuration */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-md font-medium text-gray-700">Port Configuration</h4>
                                    <button
                                        type="button"
                                        onClick={addPort}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        disabled={isLoading}
                                    >
                                        Add Port
                                    </button>
                                </div>

                                {formData.ports.map((port, index) => (
                                    <div key={index} className="flex flex-wrap space-x-2 mb-2 p-2 border rounded-md bg-white">
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
                                                className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                disabled={isLoading || formData.ports.length <= 1}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Health Check Configuration */}
                            <div className="mb-4">
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

                                            {/* Interval */}
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

                                            {/* Timeout */}
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

                                            {/* Initial Delay */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Initial Delay (seconds)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.healthChecks[0].initialDelay}
                                                    onChange={(e) => handleHealthCheckChange('initialDelay', e.target.value)}
                                                    min="0"
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            {/* Failures Before Unhealthy */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Failures Before Unhealthy
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.healthChecks[0].failuresBeforeUnhealthy}
                                                    onChange={(e) => handleHealthCheckChange('failuresBeforeUnhealthy', e.target.value)}
                                                    min="1"
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            {/* Successes Before Healthy */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Successes Before Healthy
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.healthChecks[0].successesBeforeHealthy}
                                                    onChange={(e) => handleHealthCheckChange('successesBeforeHealthy', e.target.value)}
                                                    min="1"
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div>
                        <button
                            type="submit"
                            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                            disabled={isLoading}
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
