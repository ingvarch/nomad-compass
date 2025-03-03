// src/components/jobs/forms/PortConfigurationForm.tsx
import React from 'react';
import { NomadPort } from '@/types/nomad';

interface PortConfigurationFormProps {
    ports: NomadPort[];
    enabled: boolean;
    networkMode: string;
    onPortChange: (index: number, field: keyof NomadPort, value: string) => void;
    onAddPort: () => void;
    onRemovePort: (index: number) => void;
    onToggle: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onNetworkModeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    isLoading: boolean;
}

export const PortConfigurationForm: React.FC<PortConfigurationFormProps> = ({
                                                                                ports,
                                                                                enabled,
                                                                                networkMode,
                                                                                onPortChange,
                                                                                onAddPort,
                                                                                onRemovePort,
                                                                                onToggle,
                                                                                onNetworkModeChange,
                                                                                isLoading
                                                                            }) => {
    return (
        <div className="mb-6">
            <div className="flex items-center mb-2">
                <input
                    id="enablePorts"
                    name="enablePorts"
                    type="checkbox"
                    checked={enabled}
                    onChange={onToggle}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isLoading}
                />
                <label htmlFor="enablePorts" className="ml-2 block text-md font-medium text-gray-700">
                    Enable Port Configuration
                </label>
            </div>

            {enabled && (
                <div className="border p-4 rounded-md bg-white">
                    {/* Network Mode Selection */}
                    <div className="mb-4">
                        <label htmlFor="networkMode" className="block text-sm font-medium text-gray-700 mb-1">
                            Network Mode
                        </label>
                        <select
                            id="networkMode"
                            name="networkMode"
                            value={networkMode}
                            onChange={onNetworkModeChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        >
                            <option value="none">None</option>
                            <option value="host">Host</option>
                            <option value="bridge">Bridge</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            Select the container network mode. 'None' creates an isolated network without interfaces, 'Host' uses host network directly.
                        </p>
                    </div>

                    {networkMode === 'bridge' && (
                        <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                            <p className="text-sm">
                                To use <code>bridge</code> mode, you must have the <a href="https://developer.hashicorp.com/nomad/docs/networking/cni" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">CNI plugins</a> installed at the location specified by the client's <code>cni_path</code> configuration. <a href="https://developer.hashicorp.com/nomad/docs/networking/cni" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Learn more</a>
                            </p>
                        </div>
                    )}

                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-medium text-gray-700">Ports</h4>
                        <button
                            type="button"
                            onClick={onAddPort}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={isLoading}
                        >
                            Add Port
                        </button>
                    </div>

                    {ports.map((port, index) => (
                        <div key={index} className="flex flex-wrap space-x-2 mb-2 p-2 border rounded-md bg-white">
                            <div className="w-full md:w-auto mb-2 md:mb-0">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                                <input
                                    type="text"
                                    value={port.label}
                                    onChange={(e) => onPortChange(index, 'label', e.target.value)}
                                    placeholder="http"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="w-full md:w-auto mb-2 md:mb-0">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Port</label>
                                <input
                                    type="number"
                                    value={port.value}
                                    onChange={(e) => onPortChange(index, 'value', e.target.value)}
                                    placeholder="8080"
                                    min="1"
                                    max="65535"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="w-full md:w-auto mb-2 md:mb-0">
                                <label className="block text-xs font-medium text-gray-500 mb-1">To (inside container)</label>
                                <input
                                    type="number"
                                    value={port.to}
                                    onChange={(e) => onPortChange(index, 'to', e.target.value)}
                                    placeholder="8080"
                                    min="1"
                                    max="65535"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="w-full md:w-auto mb-2 md:mb-0">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Static Port</label>
                                <select
                                    value={port.static ? 'true' : 'false'}
                                    onChange={(e) => onPortChange(index, 'static', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                >
                                    <option value="false">Dynamic</option>
                                    <option value="true">Static</option>
                                </select>
                            </div>

                            <div className="w-full md:w-auto flex items-end">
                                <button
                                    type="button"
                                    onClick={() => onRemovePort(index)}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    disabled={isLoading || ports.length <= 1}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PortConfigurationForm;
