// src/components/jobs/forms/HealthCheckForm.tsx
import React from 'react';
import { NomadHealthCheck } from '@/types/nomad';

interface HealthCheckFormProps {
    enabled: boolean;
    healthCheck: NomadHealthCheck;
    onToggle: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onChange: (field: keyof NomadHealthCheck, value: string | number) => void;
    isLoading: boolean;
}

export const HealthCheckForm: React.FC<HealthCheckFormProps> = ({
                                                                    enabled,
                                                                    healthCheck,
                                                                    onToggle,
                                                                    onChange,
                                                                    isLoading
                                                                }) => {
    return (
        <div className="mb-4">
            <div className="flex items-center mb-2">
                <input
                    id="enableHealthCheck"
                    name="enableHealthCheck"
                    type="checkbox"
                    checked={enabled}
                    onChange={onToggle}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isLoading}
                />
                <label htmlFor="enableHealthCheck" className="ml-2 block text-md font-medium text-gray-700">
                    Enable Health Check
                </label>
            </div>

            {enabled && (
                <div className="border p-4 rounded-md bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Health Check Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Check Type
                            </label>
                            <select
                                value={healthCheck.type}
                                onChange={(e) => onChange('type', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            >
                                <option value="http">HTTP</option>
                                <option value="tcp">TCP</option>
                                <option value="script">Script</option>
                            </select>
                        </div>

                        {/* Path (for HTTP) */}
                        {healthCheck.type === 'http' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    HTTP Path
                                </label>
                                <input
                                    type="text"
                                    value={healthCheck.path || ''}
                                    onChange={(e) => onChange('path', e.target.value)}
                                    placeholder="/health"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                        )}

                        {/* Command (for Script) */}
                        {healthCheck.type === 'script' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Script Command
                                </label>
                                <input
                                    type="text"
                                    value={healthCheck.command || ''}
                                    onChange={(e) => onChange('command', e.target.value)}
                                    placeholder="/bin/check-health.sh"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>
                        )}

                        {/* Interval */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Check Interval (seconds)
                            </label>
                            <input
                                type="number"
                                value={healthCheck.interval}
                                onChange={(e) => onChange('interval', e.target.value)}
                                min="1"
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Timeout */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Timeout (seconds)
                            </label>
                            <input
                                type="number"
                                value={healthCheck.timeout}
                                onChange={(e) => onChange('timeout', e.target.value)}
                                min="1"
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Initial Delay */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Initial Delay (seconds)
                            </label>
                            <input
                                type="number"
                                value={healthCheck.initialDelay}
                                onChange={(e) => onChange('initialDelay', e.target.value)}
                                min="0"
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Failures Before Unhealthy */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Failures Before Unhealthy
                            </label>
                            <input
                                type="number"
                                value={healthCheck.failuresBeforeUnhealthy}
                                onChange={(e) => onChange('failuresBeforeUnhealthy', e.target.value)}
                                min="1"
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Successes Before Healthy */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Successes Before Healthy
                            </label>
                            <input
                                type="number"
                                value={healthCheck.successesBeforeHealthy}
                                onChange={(e) => onChange('successesBeforeHealthy', e.target.value)}
                                min="1"
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthCheckForm;
