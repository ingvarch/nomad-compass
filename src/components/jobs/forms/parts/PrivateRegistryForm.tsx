import React from 'react';
import FormInputField from '../../../ui/forms/FormInputField';

interface PrivateRegistryFormProps {
  dockerAuth: {
    username: string;
    password: string;
  } | undefined;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  isLoading: boolean;
  groupIndex: number;
}

export const PrivateRegistryForm: React.FC<PrivateRegistryFormProps> = ({
  dockerAuth,
  onInputChange,
  isLoading,
  groupIndex
}) => {
  return (
    <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
      <h4 className="text-md font-medium text-gray-700 mb-3">Registry Credentials</h4>

      <FormInputField
        id={`group-${groupIndex}-dockerAuth.username`}
        name="dockerAuth.username"
        label="Username"
        type="text"
        value={dockerAuth?.username || ''}
        onChange={onInputChange}
        disabled={isLoading}
        required
      />

      <FormInputField
        id={`group-${groupIndex}-dockerAuth.password`}
        name="dockerAuth.password"
        label="Password"
        type="password"
        value={dockerAuth?.password || ''}
        onChange={onInputChange}
        disabled={isLoading}
        required
      />
    </div>
  );
};

export default PrivateRegistryForm; 