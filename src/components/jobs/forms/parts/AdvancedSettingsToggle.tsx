import React from 'react';

interface AdvancedSettingsToggleProps {
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (show: boolean) => void;
}

export const AdvancedSettingsToggle: React.FC<AdvancedSettingsToggleProps> = ({
  showAdvancedSettings,
  setShowAdvancedSettings
}) => {
  return (
    <div className="mb-6 border-t pt-4">
      <button
        type="button"
        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {showAdvancedSettings ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
      </button>
    </div>
  );
};

export default AdvancedSettingsToggle; 