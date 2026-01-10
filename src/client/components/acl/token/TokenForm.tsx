import { useState } from 'react';
import { NomadAclPolicyListItem, NomadAclRoleListItem, TokenType } from '../../../types/acl';
import { FormActions } from '../../ui/FormActions';
import { useToast } from '../../../context/ToastContext';

interface TokenFormProps {
  availablePolicies: NomadAclPolicyListItem[];
  availableRoles: NomadAclRoleListItem[];
  onSubmit: (data: {
    name: string;
    type: TokenType;
    policies: string[];
    roles: string[];
    expirationTTL?: string;
    global: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}

const EXPIRATION_OPTIONS = [
  { value: '', label: 'Never expires' },
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '365d', label: '1 year' },
];

export function TokenForm({
  availablePolicies,
  availableRoles,
  onSubmit,
  onCancel,
}: TokenFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TokenType>('client');
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [expirationTTL, setExpirationTTL] = useState('');
  const [global, setGlobal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addToast } = useToast();

  const handlePolicyToggle = (policyName: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(policyName)
        ? prev.filter((p) => p !== policyName)
        : [...prev, policyName]
    );
  };

  const handleRoleToggle = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      addToast('Token name is required', 'error');
      return;
    }

    if (type === 'client' && selectedPolicies.length === 0 && selectedRoles.length === 0) {
      addToast('Client tokens must have at least one policy or role', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        type,
        policies: type === 'client' ? selectedPolicies : [],
        roles: type === 'client' ? selectedRoles : [],
        expirationTTL: expirationTTL || undefined,
        global,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create token';
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
          Token Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-token"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Token Type
        </label>
        <div className="flex gap-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="client"
              checked={type === 'client'}
              onChange={() => setType('client')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Client
            </span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="management"
              checked={type === 'management'}
              onChange={() => setType('management')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Management
            </span>
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {type === 'management'
            ? 'Management tokens have full access to all operations'
            : 'Client tokens are restricted by attached policies and roles'}
        </p>
      </div>

      {/* Policies (only for client tokens) */}
      {type === 'client' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Policies
          </label>
          {availablePolicies.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No policies available.
            </p>
          ) : (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-200 dark:divide-gray-600 max-h-40 overflow-y-auto">
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
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {policy.Name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roles (only for client tokens) */}
      {type === 'client' && availableRoles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Roles
          </label>
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-200 dark:divide-gray-600 max-h-40 overflow-y-auto">
            {availableRoles.map((role) => (
              <label
                key={role.ID}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.Name)}
                  onChange={() => handleRoleToggle(role.Name)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {role.Name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Expiration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Expiration
        </label>
        <select
          value={expirationTTL}
          onChange={(e) => setExpirationTTL(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
        >
          {EXPIRATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Global */}
      <div>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={global}
            onChange={(e) => setGlobal(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Global token
          </span>
        </label>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Global tokens are replicated across all regions
        </p>
      </div>

      {/* Actions */}
      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        submitLabel="Create Token"
      />
    </form>
  );
}
