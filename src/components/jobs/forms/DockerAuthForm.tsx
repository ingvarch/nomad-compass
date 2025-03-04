// src/components/jobs/forms/DockerAuthForm.tsx
import React from 'react';
import { DockerAuth } from '@/types/nomad';

interface DockerAuthFormProps {
    dockerAuth: DockerAuth;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
    prefix?: string;
}

export const DockerAuthForm: React.FC<DockerAuthFormProps> = ({
                                                                  dockerAuth,
                                                                  onChange,
                                                                  isLoading,
                                                                  prefix = ''
                                                              }) => {
    return (
        <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h4 className="text-md font-medium text-gray-700 mb-3">Registry Credentials</h4>

            {/* Username */}
            <div className="mb-3">
                <label htmlFor={`${prefix}dockerAuth.username`} className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                </label>
                <input
                    id={`${prefix}dockerAuth.username`}
                    name="dockerAuth.username"
                    type="text"
                    value={dockerAuth?.username || ''}
                    onChange={onChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                    required
                />
            </div>

            {/* Password */}
            <div className="mb-3">
                <label htmlFor={`${prefix}dockerAuth.password`} className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                </label>
                <input
                    id={`${prefix}dockerAuth.password`}
                    name="dockerAuth.password"
                    type="password"
                    value={dockerAuth?.password || ''}
                    onChange={onChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                    required
                />
            </div>
        </div>
    );
};

export default DockerAuthForm;
