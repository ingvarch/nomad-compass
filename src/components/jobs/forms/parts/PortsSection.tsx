import React from 'react';
import { Trash } from 'lucide-react';
import { NomadPort } from '@/types/nomad';

interface PortsSectionProps {
  ports: NomadPort[];
  onPortChange: (portIndex: number, field: keyof NomadPort, value: string) => void;
  onAddPort: () => void;
  onRemovePort: (portIndex: number) => void;
  isLoading: boolean;
}

export const PortsSection: React.FC<PortsSectionProps> = ({
  ports,
  onPortChange,
  onAddPort,
  onRemovePort,
  isLoading
}) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h6 className="text-sm font-medium text-gray-700">Ports</h6>
      </div>

      {ports.length === 0 ? (
        <div className="flex flex-wrap items-end gap-2 mb-2 p-2 border rounded-md bg-white">
          <div className="w-1/5">
            <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
            <input
              type="text"
              value=""
              onChange={(e) => onPortChange(0, 'label', e.target.value)}
              placeholder="http"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          <div className="w-1/5">
            <label className="block text-xs font-medium text-gray-500 mb-1">Port Type</label>
            <select
              value="false"
              onChange={(e) => onPortChange(0, 'static', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="false">Dynamic</option>
              <option value="true">Static</option>
            </select>
          </div>

          <div className="w-1/5">
            <label className="block text-xs font-medium text-gray-500 mb-1">Host Port</label>
            <span className="block p-2 border bg-gray-100 text-gray-500 rounded-md h-10">
              Dynamic
            </span>
          </div>

          <div className="w-1/5">
            <label className="block text-xs font-medium text-gray-500 mb-1">Container Port</label>
            <input
              type="number"
              value="8080"
              onChange={(e) => onPortChange(0, 'to', e.target.value)}
              placeholder="8080"
              min="1"
              max="65535"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          <div className="h-10 flex items-center">
            <button
              type="button"
              onClick={onAddPort}
              className="flex justify-center items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-16"
              disabled={isLoading}
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        ports.map((port, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2 mb-2 p-2 border rounded-md bg-white">
            <div className="w-1/5">
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

            <div className="w-1/5">
              <label className="block text-xs font-medium text-gray-500 mb-1">Port Type</label>
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

            <div className="w-1/5">
              <label className="block text-xs font-medium text-gray-500 mb-1">Host Port</label>
              {port.static ? (
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
              ) : (
                <span className="block p-2 border bg-gray-100 text-gray-500 rounded-md h-10">
                  Dynamic
                </span>
              )}
            </div>

            <div className="w-1/5">
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

            <div className="h-10 flex items-center">
              {index === ports.length - 1 ? (
                <button
                  type="button"
                  onClick={onAddPort}
                  className="flex justify-center items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-16"
                  disabled={isLoading}
                >
                  Add
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onRemovePort(index)}
                  className="flex justify-center items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-16"
                  disabled={isLoading}
                >
                  <Trash size={16} />
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default PortsSection; 