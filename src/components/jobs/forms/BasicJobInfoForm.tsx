// src/components/jobs/forms/BasicJobInfoForm.tsx
import React, { useState } from 'react';

interface BasicJobInfoFormProps {
    name: string;
    image: string;
    plugin: string;
    namespace: string;
    count: number;
    datacenters: string[];
    namespaces: string[];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    isLoading: boolean;
    isLoadingNamespaces: boolean;
}

export const BasicJobInfoForm: React.FC<BasicJobInfoFormProps> = ({
                                                                      name,
                                                                      image,
                                                                      plugin,
                                                                      namespace,
                                                                      count,
                                                                      datacenters,
                                                                      namespaces,
                                                                      onChange,
                                                                      isLoading,
                                                                      isLoadingNamespaces
                                                                  }) => {
    const [isNameValid, setIsNameValid] = useState(true);

    // Validate job name using regex: only alphanumeric characters, hyphens, underscores, and dots
    const validateJobName = (value: string) => {
        const jobNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
        return jobNameRegex.test(value);
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setIsNameValid(validateJobName(newName));
        onChange(e);
    };

    return (
        <>
            {/* Job Name */}
            <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Job Name
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    placeholder="my-service"
                    className={`w-full p-2 border ${!isNameValid ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    disabled={isLoading}
                    required
                />
                {!isNameValid && (
                    <p className="mt-1 text-sm text-red-600">
                        Job name must start with a letter or number and contain only letters, numbers, hyphens, underscores, and dots.
                    </p>
                )}
            </div>

            {/* Namespace Selector */}
            <div className="mb-4">
                <label htmlFor="namespace" className="block text-sm font-medium text-gray-700 mb-1">
                    Namespace
                </label>
                <select
                    id="namespace"
                    name="namespace"
                    value={namespace}
                    onChange={onChange}
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
                    value={image}
                    onChange={onChange}
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
                    value={plugin}
                    onChange={onChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                >
                    <option value="podman">Podman</option>
                    <option value="docker">Docker</option>
                </select>
            </div>
        </>
    );
};

export default BasicJobInfoForm;
