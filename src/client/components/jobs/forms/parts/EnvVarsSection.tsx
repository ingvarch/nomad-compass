import React, { useState } from 'react';
import { Eye, EyeOff, Trash } from 'lucide-react';
import { NomadEnvVar } from '../../../../types/nomad';

interface EnvVarsSectionProps {
  envVars: NomadEnvVar[];
  onEnvVarChange: (varIndex: number, field: 'key' | 'value', value: string) => void;
  onAddEnvVar: () => void;
  onRemoveEnvVar: (varIndex: number) => void;
  isLoading: boolean;
}

export const EnvVarsSection: React.FC<EnvVarsSectionProps> = ({
  envVars,
  onEnvVarChange,
  onAddEnvVar,
  onRemoveEnvVar,
  isLoading
}) => {
  // Track which environment variables have visible values
  const [visibleEnvValues, setVisibleEnvValues] = useState<Record<number, boolean>>({});

  // Toggle visibility for a specific env var
  const toggleEnvValueVisibility = (index: number) => {
    setVisibleEnvValues(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h5 className="text-md font-medium text-gray-700">Environment Variables</h5>
      </div>

      {envVars.length === 0 ? (
        <div className="flex space-x-2 mb-2 items-center">
          <input
            type="text"
            value=""
            onChange={(e) => onEnvVarChange(0, 'key', e.target.value)}
            placeholder="KEY"
            className="w-1/3 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <div className="relative w-1/2">
            <input
              type="password"
              value=""
              onChange={(e) => onEnvVarChange(0, 'value', e.target.value)}
              placeholder="value"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => toggleEnvValueVisibility(0)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              disabled={isLoading}
            >
              <Eye size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={onAddEnvVar}
            className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-16"
            disabled={isLoading}
          >
            Add
          </button>
        </div>
      ) : (
        envVars.map((envVar, index) => (
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
                type={visibleEnvValues[index] ? "text" : "password"}
                value={envVar.value}
                onChange={(e) => onEnvVarChange(index, 'value', e.target.value)}
                placeholder="value"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => toggleEnvValueVisibility(index)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                disabled={isLoading}
              >
                {visibleEnvValues[index] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {index === envVars.length - 1 ? (
              <button
                type="button"
                onClick={onAddEnvVar}
                className="flex justify-center items-center p-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-16"
                disabled={isLoading}
              >
                Add
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRemoveEnvVar(index)}
                className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-16"
                disabled={isLoading}
              >
                <Trash size={16} className="mx-auto" />
              </button>
            )}
            {index === envVars.length - 1 ? null : (
              <div className="w-16">
                {/* Empty block to align the buttons */}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default EnvVarsSection; 