// src/components/jobs/forms/PortConfigurationForm.tsx
import React from 'react';
import { NomadPort } from '@/types/nomad';
import { Plus, Trash } from 'lucide-react';

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
                            <option value="bridge">Bridge</option>
                            <option value="host">Host</option>
                            <option value="none">None</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            Select the container network mode. 'Bridge' is recommended for service discovery, 'Host' uses host network directly, and 'None' creates an isolated network without interfaces.
                        </p>
                        {networkMode === 'none' && (
                            <div className="mt-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                                <p className="text-sm">
                                    Warning: Using <code>none</code> mode will prevent containers from communicating by service name (like task-name.service.nomad). For service discovery to work, use <code>bridge</code> or <code>host</code> mode.
                                </p>
                            </div>
                        )}
                    </div>

                    {networkMode === 'bridge' && (
                        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700">
                            <p className="text-sm">
                                <strong>Bridge mode:</strong> This enables container-to-container communication using service names like <code>redis.service.nomad</code>.
                                Make sure you have the <a href="https://developer.hashicorp.com/nomad/docs/networking/cni" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">CNI plugins</a> installed on your Nomad clients.
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
                            <Plus size={14} className="mr-1" /> Add Port
                        </button>
                    </div>

                    {ports.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">No ports defined. Click "Add Port" to add one.</div>
                    ) : (
                        ports.map((port, index) => (
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

                                {port.static ? (
                                    <div className="w-full md:w-auto mb-2 md:mb-0">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Host Port</label>
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
                                ) : (
                                    <div className="w-full md:w-auto mb-2 md:mb-0 flex items-end">
                                        <span className="p-2 border bg-gray-100 text-gray-500 rounded-md">
                                            Dynamic
                                        </span>
                                    </div>
                                )}

                                <div className="w-full md:w-auto mb-2 md:mb-0">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Container Port</label>
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

                                {ports.length > 1 && (
                                    <div className="w-full md:w-auto flex items-end">
                                        <button
                                            type="button"
                                            onClick={() => onRemovePort(index)}
                                            className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                            disabled={isLoading}
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700">
                        <h5 className="font-medium">Nomad Environment Variables</h5>
                        <p className="text-sm mt-1">
                            Nomad injects port information as environment variables at runtime:
                        </p>
                        <ul className="text-xs mt-2 list-disc list-inside">
                            <li>Inside a container: <code className="bg-blue-100 px-1 py-0.5 rounded">NOMAD_PORT_<em>label</em></code> - Port inside the container</li>
                            <li>Inside a container: <code className="bg-blue-100 px-1 py-0.5 rounded">NOMAD_HOST_PORT_<em>label</em></code> - Port on the host</li>
                            <li>Inside a container: <code className="bg-blue-100 px-1 py-0.5 rounded">NOMAD_ADDR_<em>label</em></code> - IP:port for this service</li>
                            <li>Inside a container: <code className="bg-blue-100 px-1 py-0.5 rounded">NOMAD_HOST_ADDR_<em>label</em></code> - Host IP:port</li>
                        </ul>
                        <p className="text-xs mt-2">Example: <code className="bg-blue-100 px-1 py-0.5 rounded">redis_url=$NOMAD_ADDR_redis</code></p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortConfigurationForm;
