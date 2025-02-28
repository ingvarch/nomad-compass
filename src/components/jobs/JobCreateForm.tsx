'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import { NomadEnvVar, NomadJobFormData } from '@/types/nomad';

export const JobCreateForm: React.FC = () => {
    const router = useRouter();
    const { token, nomadAddr } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Default form values
    const [formData, setFormData] = useState<NomadJobFormData>({
        name: '',
        image: '',
        plugin: 'podman',
        resources: {
            CPU: 100,
            MemoryMB: 256,
            DiskMB: 500,
        },
        envVars: [{ key: '', value: '' }]
    });

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name.startsWith('resources.')) {
            const resourceField = name.split('.')[1];
            setFormData({
                ...formData,
                resources: {
                    ...formData.resources,
                    [resourceField]: parseInt(value, 10)
                }
            });
        } else {
            setFormData({
                ...formData,
                [name]: value
            });
        }
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

    // Create Nomad job specification from form data
    const createJobSpec = () => {
        // Convert environment variables to the format expected by Nomad
        const env: Record<string, string> = {};
        formData.envVars.forEach((envVar) => {
            if (envVar.key.trim() !== '') {
                env[envVar.key] = envVar.value;
            }
        });

        // Basic HCL job template for Nomad
        return {
            Job: {
                ID: formData.name,
                Name: formData.name,
                Type: 'service',
                Datacenters: ['dc1'],
                TaskGroups: [
                    {
                        Name: formData.name,
                        Count: 1,
                        Networks: [
                            {
                                Mode: 'host',
                                DynamicPorts: [
                                    {
                                        Label: 'http',
                                        To: 8080
                                    }
                                ]
                            }
                        ],
                        Tasks: [
                            {
                                Name: formData.name,
                                Driver: formData.plugin,
                                Config: {
                                    image: formData.image,
                                    ports: ['http'],
                                },
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

            // Create job spec from form data
            const jobSpec = createJobSpec();

            // Submit job to Nomad
            const client = createNomadClient(nomadAddr, token);
            const response = await client.createJob(jobSpec);

            setSuccess(`Job "${formData.name}" created successfully!`);

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
