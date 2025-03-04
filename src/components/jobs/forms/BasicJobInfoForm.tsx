// src/components/jobs/forms/BasicJobInfoForm.tsx
import React from 'react';

interface BasicJobInfoFormProps {
    name: string;
    namespace: string;
    count: number;
    datacenters: string[];
    namespaces: string[];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    isLoading: boolean;
    isLoadingNamespaces: boolean;
    isNameValid: boolean;
}

export const BasicJobInfoForm: React.FC<BasicJobInfoFormProps> = ({
                                                                      name,
                                                                      namespace,
                                                                      count,
                                                                      datacenters,
                                                                      namespaces,
                                                                      onChange,
                                                                      isLoading,
                                                                      isLoadingNamespaces,
                                                                      isNameValid
                                                                  }) => {
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
                    onChange={onChange}
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
        </>
    );
};

export default BasicJobInfoForm;
