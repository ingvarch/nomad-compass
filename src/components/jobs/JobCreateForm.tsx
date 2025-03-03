// src/components/jobs/JobCreateForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import { NomadJobFormData, NomadPort, NomadHealthCheck } from '@/types/nomad';

import BasicJobInfoForm from './forms/BasicJobInfoForm';
import ResourcesForm from './forms/ResourcesForm';
import EnvironmentVariablesForm from './forms/EnvironmentVariablesForm';
import DockerAuthForm from './forms/DockerAuthForm';
import AdvancedSettingsForm from './forms/AdvancedSettingsForm';

interface NetworkConfig {
    Mode: string;
    DynamicPorts: Array<{Label: string, To: number}>;
    ReservedPorts: Array<{Label: string, Value: number, To?: number}>;
}

interface TaskGroupConfig {
    Name: string;
    Count: number;
    Tasks: Array<any>;
    Networks?: Array<NetworkConfig>;
    Services?: Array<any>;
}

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
        enablePorts: false,
        networkMode: 'none',
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

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
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

        // Prepare network configuration based on user selection
        let network: NetworkConfig | undefined;

        if (!formData.enablePorts) {
            network = undefined;
        } else {
            network = {
                Mode: formData.networkMode,
                DynamicPorts: [] as Array<{Label: string, To: number}>,
                ReservedPorts: [] as Array<{Label: string, Value: number, To?: number}>
            };

            // Process ports configuration
            formData.ports.forEach(port => {
                if (port.label.trim() === '') return;

                if (port.static) {
                    network!.ReservedPorts.push({
                        Label: port.label,
                        Value: port.value,
                        ...(port.to && port.to !== port.value ? {To: port.to} : {})
                    });
                } else {
                    network!.DynamicPorts.push({
                        Label: port.label,
                        To: port.to || port.value
                    });
                }
            });
        }

        // Prepare services with health checks if enabled
        const services = formData.enableHealthCheck ? formData.healthChecks.map(check => {
            const healthCheck = {
                Name: `${formData.name}-health`,
                PortLabel: (formData.enablePorts && formData.ports.length > 0) ? formData.ports[0].label : 'http',
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
        };

        // Add ports to taskConfig only if enabled
        if (formData.enablePorts && formData.networkMode !== 'none') {
            taskConfig.ports = formData.ports.map(p => p.label).filter(label => label.trim() !== '');
        }

        // DockerAuth for private registry
        if (formData.usePrivateRegistry && formData.dockerAuth) {
            taskConfig.auth = {
                username: formData.dockerAuth.username,
                password: formData.dockerAuth.password
            };
        }

        const taskGroup: TaskGroupConfig = {
            Name: formData.name,
            Count: formData.count,
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
        };

        if (network) {
            taskGroup.Networks = [network];
        }

        if (services.length > 0) {
            taskGroup.Services = services;
        }

        // Basic job template for Nomad
        return {
            Job: {
                ID: formData.name,
                Name: formData.name,
                Namespace: formData.namespace,
                Type: 'service',
                Datacenters: formData.datacenters,
                TaskGroups: [taskGroup]
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
