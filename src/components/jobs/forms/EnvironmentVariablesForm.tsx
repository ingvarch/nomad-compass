// src/components/jobs/forms/EnvironmentVariablesForm.tsx
import React, { useState, useEffect } from 'react';
import { NomadEnvVar } from '@/types/nomad';
import { Eye, EyeOff, Trash, Plus } from 'lucide-react';

interface EnvironmentVariablesFormProps {
    envVars: NomadEnvVar[];
    onEnvVarChange: (index: number, field: 'key' | 'value', value: string) => void;
    onAddEnvVar: () => void;
    onRemoveEnvVar: (index: number) => void;
    isLoading: boolean;
}

export const EnvironmentVariablesForm: React.FC<EnvironmentVariablesFormProps> = ({
                                                                                      envVars,
                                                                                      onEnvVarChange,
                                                                                      onAddEnvVar,
                                                                                      onRemoveEnvVar,
                                                                                      isLoading
                                                                                  }) => {
    // Track which environment variables have visible values
    const [visibleValues, setVisibleValues] = useState<Record<number, boolean>>({});

    // Toggle visibility for a specific env var
    const toggleValueVisibility = (index: number) => {
        setVisibleValues(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    // Ensure at least one empty field is always visible
    useEffect(() => {
        if (envVars.length === 0) {
            onAddEnvVar();
        }
    }, [envVars, onAddEnvVar]);

    return (
        <div className="mb-6">
            <div className="mb-2">
                <h3 className="text-md font-medium text-gray-700">Environment Variables</h3>
            </div>

            {envVars.map((envVar, index) => (
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
                            type={visibleValues[index] ? "text" : "password"}
                            value={envVar.value}
                            onChange={(e) => onEnvVarChange(index, 'value', e.target.value)}
                            placeholder="value"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => toggleValueVisibility(index)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            disabled={isLoading}
                        >
                            {visibleValues[index] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {index === envVars.length - 1 ? (
                        <button
                            type="button"
                            onClick={onAddEnvVar}
                            className="px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 h-10 w-16"
                            disabled={isLoading}
                        >
                            Add
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onRemoveEnvVar(index)}
                            className="px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 h-10 w-16"
                            disabled={isLoading}
                        >
                            <Trash size={16} className="mx-auto" />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

export default EnvironmentVariablesForm;
