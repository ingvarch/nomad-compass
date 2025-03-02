// src/components/jobs/forms/ResourcesForm.tsx
import React from 'react';
import { NomadResource } from '@/types/nomad';

interface ResourcesFormProps {
    resources: NomadResource;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
}

export const ResourcesForm: React.FC<ResourcesFormProps> = ({ resources, onChange, isLoading }) => {
    return (
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
                        value={resources.CPU}
                        onChange={onChange}
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
                        value={resources.MemoryMB}
                        onChange={onChange}
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
                        value={resources.DiskMB}
                        onChange={onChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                </div>
            </div>
        </div>
    );
};

export default ResourcesForm;
