import React from 'react';
import FormInputField from '../../../ui/forms/FormInputField';

interface AdvancedSettingsSectionProps {
  datacenters: string[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  isLoading: boolean;
}

export const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
  datacenters,
  onInputChange,
  isLoading
}) => {
  return (
    <div className="mb-6 border p-4 rounded-md bg-gray-50">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>

      {/* Datacenters */}
      <FormInputField
        id="datacenters"
        name="datacenters"
        label="Datacenters"
        type="text"
        value={datacenters.join(', ')}
        onChange={onInputChange}
        placeholder="dc1, dc2, dc3"
        disabled={isLoading}
        helpText="Comma-separated list of datacenters where this job can run"
      />
    </div>
  );
};

export default AdvancedSettingsSection; 