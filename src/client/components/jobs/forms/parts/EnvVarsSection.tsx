import React from 'react';
import { Trash, Plus } from 'lucide-react';
import { NomadEnvVar } from '../../../../types/nomad';
import { useToggleState } from '../../../../hooks/useToggleState';
import { VisibilityToggleButton } from '../../../ui/VisibilityToggleButton';
import { inputBaseStyles } from '../../../../lib/styles';

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
  const { isActive: isVisible, toggle: toggleVisibility } = useToggleState<number>();

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h5 className="text-md font-medium text-gray-700 dark:text-gray-300">Environment Variables</h5>
      </div>

      {/* Existing env vars */}
      {envVars.map((envVar, index) => (
        <div key={index} className="flex space-x-2 mb-2 items-center">
          <input
            type="text"
            value={envVar.key}
            onChange={(e) => onEnvVarChange(index, 'key', e.target.value)}
            placeholder="KEY"
            className={`flex-1 min-w-0 p-2 ${inputBaseStyles}`}
            disabled={isLoading}
          />
          <div className="relative flex-1 min-w-0">
            <input
              type={isVisible(index) ? "text" : "password"}
              value={envVar.value}
              onChange={(e) => onEnvVarChange(index, 'value', e.target.value)}
              placeholder="value"
              className={`w-full p-2 pr-10 ${inputBaseStyles}`}
              disabled={isLoading}
            />
            <VisibilityToggleButton
              isVisible={isVisible(index)}
              onToggle={() => toggleVisibility(index)}
              disabled={isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            />
          </div>
          <button
            type="button"
            onClick={() => onRemoveEnvVar(index)}
            className="flex-shrink-0 p-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            disabled={isLoading}
            title="Remove"
          >
            <Trash size={16} />
          </button>
        </div>
      ))}

      {/* Add button */}
      <button
        type="button"
        onClick={onAddEnvVar}
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
        disabled={isLoading}
      >
        <Plus size={16} />
        Add Variable
      </button>
    </div>
  );
};

export default EnvVarsSection; 