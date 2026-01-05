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
    <div className="mb-6 p-4 border border-gray-200 dark:border-monokai-muted rounded-md bg-gray-50 dark:bg-monokai-surface">
      <h4 className="text-md font-medium text-gray-700 dark:text-monokai-text mb-3">Registry Credentials</h4>

      {/* Security warning */}
      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md">
        <div className="flex">
          <svg className="h-5 w-5 text-amber-400 dark:text-amber-500 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <p className="font-medium">Security Notice</p>
            <p className="mt-1">Credentials are stored in the job specification. For production, consider using Nomad Vault integration or node-level registry authentication.</p>
          </div>
        </div>
      </div>

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