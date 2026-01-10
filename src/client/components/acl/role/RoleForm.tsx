import { useState } from 'react';
import { NomadAclRole, NomadAclPolicyListItem } from '../../../types/acl';
import { FormActions } from '../../ui/FormActions';
import { useToast } from '../../../context/ToastContext';

interface RoleFormProps {
  mode: 'create' | 'edit';
  role?: NomadAclRole;
  availablePolicies: NomadAclPolicyListItem[];
  onSubmit: (name: string, description: string, policyNames: string[]) => Promise<void>;
  onCancel: () => void;
}

export function RoleForm({
  mode,
  role,
  availablePolicies,
  onSubmit,
  onCancel,
}: RoleFormProps) {
  const [name, setName] = useState(role?.Name || '');
  const [description, setDescription] = useState(role?.Description || '');
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>(
    role?.Policies?.map((p) => p.Name) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addToast } = useToast();

  const handlePolicyToggle = (policyName: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(policyName)
        ? prev.filter((p) => p !== policyName)
        : [...prev, policyName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      addToast('Role name is required', 'error');
      return;
    }

    if (selectedPolicies.length === 0) {
      addToast('At least one policy must be selected', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name, description, selectedPolicies);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save role';
      addToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Role Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-role"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Alphanumeric characters and dashes only, max 128 characters
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Policies */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Policies
        </label>
        {availablePolicies.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No policies available. Create a policy first.
          </p>
        ) : (
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-200 dark:divide-gray-600 max-h-64 overflow-y-auto">
            {availablePolicies.map((policy) => (
              <label
                key={policy.Name}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPolicies.includes(policy.Name)}
                  onChange={() => handlePolicyToggle(policy.Name)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {policy.Name}
                  </span>
                  {policy.Description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {policy.Description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
        {selectedPolicies.length > 0 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {selectedPolicies.length} policy{selectedPolicies.length !== 1 ? 'ies' : ''}{' '}
            selected
          </p>
        )}
      </div>

      {/* Actions */}
      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        disabled={availablePolicies.length === 0}
        submitLabel={mode === 'create' ? 'Create Role' : 'Update Role'}
      />
    </form>
  );
}
