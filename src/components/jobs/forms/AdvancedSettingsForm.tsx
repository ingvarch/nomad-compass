// src/components/jobs/forms/AdvancedSettingsForm.tsx
import React from 'react';
import PortConfigurationForm from './PortConfigurationForm';
import HealthCheckForm from './HealthCheckForm';
import { NomadPort, NomadHealthCheck } from '@/types/nomad';

interface AdvancedSettingsFormProps {
    count: number;
    datacenters: string[];
    ports: NomadPort[];
    enableHealthCheck: boolean;
    healthChecks: NomadHealthCheck[];
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPortChange: (index: number, field: keyof NomadPort, value: string) => void;
    onAddPort: () => void;
    onRemovePort: (index: number) => void;
    onHealthCheckChange: (field: keyof NomadHealthCheck, value: string | number) => void;
    isLoading: boolean;
}

export const AdvancedSettingsForm: React.FC<AdvancedSettingsFormProps> = ({
  count,
  datacenters,
  ports,
  enableHealthCheck,
  healthChecks,
  onInputChange,
  onCheckboxChange,
  onPortChange,
  onAddPort,
  onRemovePort,
  onHealthCheckChange,
  isLoading
}) => {
    return (
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
                    value={count}
                    onChange={onInputChange}
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
                    value={datacenters.join(', ')}
                    onChange={onInputChange}
                    placeholder="dc1, dc2, dc3"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
                <p className="mt-1 text-xs text-gray-500">
                    Comma-separated list of datacenters where this job can run
                </p>
            </div>

            {/* Port Configuration */}
            <PortConfigurationForm
                ports={ports}
                onPortChange={onPortChange}
                onAddPort={onAddPort}
                onRemovePort={onRemovePort}
                isLoading={isLoading}
            />

            {/* Health Check Configuration */}
            <HealthCheckForm
                enabled={enableHealthCheck}
                healthCheck={healthChecks[0]}
                onToggle={onCheckboxChange}
                onChange={onHealthCheckChange}
                isLoading={isLoading}
            />
        </div>
    );
};

export default AdvancedSettingsForm;
