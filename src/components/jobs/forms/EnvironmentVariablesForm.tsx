// src/components/jobs/forms/EnvironmentVariablesForm.tsx
import React from 'react';
import { NomadEnvVar } from '@/types/nomad';

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
    return (
        <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium text-gray-700">Environment Variables</h3>
                <button
                    type="button"
                    onClick={onAddEnvVar}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={isLoading}
                >
                    Add Variable
                </button>
            </div>

            {envVars.map((envVar, index) => (
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
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        disabled={isLoading || envVars.length <= 1}
                    >
                        Remove
                    </button>
                </div>
            ))}
        </div>
    );
};

export default EnvironmentVariablesForm;
