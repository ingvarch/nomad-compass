// src/components/jobs/forms/BasicJobInfoForm.tsx
import React from 'react';
import { inputMonokaiStyles, inputMonokaiErrorStyles } from '../../../lib/styles';

interface BasicJobInfoFormProps {
    name: string;
    namespace: string;
    namespaces: string[];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    isLoading: boolean;
    isLoadingNamespaces: boolean;
    isNameValid: boolean;
}

const BasicJobInfoForm: React.FC<BasicJobInfoFormProps> = ({
                                                                      name,
                                                                      namespace,
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
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-monokai-text mb-1">
                    Job Name
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={onChange}
                    placeholder="my-service"
                    className={isNameValid ? inputMonokaiStyles : inputMonokaiErrorStyles}
                    disabled={isLoading}
                    required
                />
                {!isNameValid && (
                    <p className="mt-1 text-sm text-red-600 dark:text-monokai-red">
                        Job name must start with a letter or number and contain only letters, numbers, hyphens, underscores, and dots.
                    </p>
                )}
            </div>

            {/* Namespace Selector */}
            <div className="mb-4">
                <label htmlFor="namespace" className="block text-sm font-medium text-gray-700 dark:text-monokai-text mb-1">
                    Namespace
                </label>
                <select
                    id="namespace"
                    name="namespace"
                    value={namespace}
                    onChange={onChange}
                    className={inputMonokaiStyles}
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
