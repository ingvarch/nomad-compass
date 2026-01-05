import React, { useState, useEffect } from 'react';
import { NomadNamespace } from '../../types/nomad';

interface MetaEntry {
  key: string;
  value: string;
}

interface NamespaceFormProps {
  mode: 'create' | 'edit';
  namespace?: NomadNamespace;
  onSubmit: (namespace: NomadNamespace) => Promise<void>;
  onCancel: () => void;
}

export const NamespaceForm: React.FC<NamespaceFormProps> = ({
  mode,
  namespace,
  onSubmit,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [metaEntries, setMetaEntries] = useState<MetaEntry[]>([]);
  const [enabledDrivers, setEnabledDrivers] = useState<string[]>([]);
  const [disabledDrivers, setDisabledDrivers] = useState<string[]>([]);
  const [newEnabledDriver, setNewEnabledDriver] = useState('');
  const [newDisabledDriver, setNewDisabledDriver] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (namespace) {
      setName(namespace.Name);
      setDescription(namespace.Description || '');

      // Convert Meta object to entries array
      if (namespace.Meta) {
        const entries = Object.entries(namespace.Meta).map(([key, value]) => ({
          key,
          value,
        }));
        setMetaEntries(entries);
      }

      // Set capabilities
      if (namespace.Capabilities) {
        setEnabledDrivers(namespace.Capabilities.EnabledTaskDrivers || []);
        setDisabledDrivers(namespace.Capabilities.DisabledTaskDrivers || []);
      }
    }
  }, [namespace]);

  const handleAddMetaEntry = () => {
    setMetaEntries([...metaEntries, { key: '', value: '' }]);
  };

  const handleRemoveMetaEntry = (index: number) => {
    setMetaEntries(metaEntries.filter((_, i) => i !== index));
  };

  const handleMetaKeyChange = (index: number, key: string) => {
    const updated = [...metaEntries];
    updated[index].key = key;
    setMetaEntries(updated);
  };

  const handleMetaValueChange = (index: number, value: string) => {
    const updated = [...metaEntries];
    updated[index].value = value;
    setMetaEntries(updated);
  };

  const handleAddEnabledDriver = () => {
    if (newEnabledDriver.trim() && !enabledDrivers.includes(newEnabledDriver.trim())) {
      setEnabledDrivers([...enabledDrivers, newEnabledDriver.trim()]);
      setNewEnabledDriver('');
    }
  };

  const handleRemoveEnabledDriver = (driver: string) => {
    setEnabledDrivers(enabledDrivers.filter((d) => d !== driver));
  };

  const handleAddDisabledDriver = () => {
    if (newDisabledDriver.trim() && !disabledDrivers.includes(newDisabledDriver.trim())) {
      setDisabledDrivers([...disabledDrivers, newDisabledDriver.trim()]);
      setNewDisabledDriver('');
    }
  };

  const handleRemoveDisabledDriver = (driver: string) => {
    setDisabledDrivers(disabledDrivers.filter((d) => d !== driver));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Namespace name is required');
      return;
    }

    // Validate name format (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setError('Name can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    // Build Meta object from entries
    const meta: Record<string, string> = {};
    for (const entry of metaEntries) {
      if (entry.key.trim()) {
        meta[entry.key.trim()] = entry.value;
      }
    }

    const namespaceData: NomadNamespace = {
      Name: name.trim(),
      Description: description.trim() || undefined,
      Meta: Object.keys(meta).length > 0 ? meta : undefined,
      Capabilities:
        enabledDrivers.length > 0 || disabledDrivers.length > 0
          ? {
              EnabledTaskDrivers: enabledDrivers.length > 0 ? enabledDrivers : undefined,
              DisabledTaskDrivers: disabledDrivers.length > 0 ? disabledDrivers : undefined,
            }
          : undefined,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(namespaceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save namespace');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses =
    'w-full p-2 border border-gray-300 dark:border-monokai-muted rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-monokai-blue bg-white dark:bg-monokai-surface text-gray-900 dark:text-monokai-text';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Name */}
      <div>
        <label
          htmlFor="namespace-name"
          className="block text-sm font-medium text-gray-700 dark:text-monokai-text mb-1"
        >
          Name *
        </label>
        <input
          id="namespace-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClasses}
          placeholder="my-namespace"
          disabled={mode === 'edit'}
          required
        />
        {mode === 'edit' && (
          <p className="mt-1 text-xs text-gray-500 dark:text-monokai-muted">
            Name cannot be changed after creation
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="namespace-description"
          className="block text-sm font-medium text-gray-700 dark:text-monokai-text mb-1"
        >
          Description
        </label>
        <textarea
          id="namespace-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClasses}
          placeholder="Optional description for this namespace"
          rows={2}
        />
      </div>

      {/* Meta */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-monokai-text">
            Metadata
          </label>
          <button
            type="button"
            onClick={handleAddMetaEntry}
            className="text-xs text-blue-600 dark:text-monokai-blue hover:underline"
          >
            + Add entry
          </button>
        </div>
        {metaEntries.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-monokai-muted">
            No metadata entries
          </p>
        ) : (
          <div className="space-y-2">
            {metaEntries.map((entry, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={entry.key}
                  onChange={(e) => handleMetaKeyChange(index, e.target.value)}
                  className={`${inputClasses} flex-1`}
                  placeholder="Key"
                />
                <input
                  type="text"
                  value={entry.value}
                  onChange={(e) => handleMetaValueChange(index, e.target.value)}
                  className={`${inputClasses} flex-1`}
                  placeholder="Value"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveMetaEntry(index)}
                  className="px-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Capabilities - Enabled Task Drivers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-monokai-text mb-1">
          Enabled Task Drivers
        </label>
        <p className="text-xs text-gray-500 dark:text-monokai-muted mb-2">
          Only these drivers will be allowed (leave empty for all drivers)
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newEnabledDriver}
            onChange={(e) => setNewEnabledDriver(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddEnabledDriver();
              }
            }}
            className={`${inputClasses} flex-1`}
            placeholder="e.g., docker, exec"
          />
          <button
            type="button"
            onClick={handleAddEnabledDriver}
            className="px-3 py-2 text-sm bg-blue-600 dark:bg-monokai-blue text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            Add
          </button>
        </div>
        {enabledDrivers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {enabledDrivers.map((driver) => (
              <span
                key={driver}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded"
              >
                {driver}
                <button
                  type="button"
                  onClick={() => handleRemoveEnabledDriver(driver)}
                  className="hover:text-green-600 dark:hover:text-green-200"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Capabilities - Disabled Task Drivers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-monokai-text mb-1">
          Disabled Task Drivers
        </label>
        <p className="text-xs text-gray-500 dark:text-monokai-muted mb-2">
          These drivers will be blocked in this namespace
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newDisabledDriver}
            onChange={(e) => setNewDisabledDriver(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddDisabledDriver();
              }
            }}
            className={`${inputClasses} flex-1`}
            placeholder="e.g., raw_exec"
          />
          <button
            type="button"
            onClick={handleAddDisabledDriver}
            className="px-3 py-2 text-sm bg-blue-600 dark:bg-monokai-blue text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            Add
          </button>
        </div>
        {disabledDrivers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {disabledDrivers.map((driver) => (
              <span
                key={driver}
                className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded"
              >
                {driver}
                <button
                  type="button"
                  onClick={() => handleRemoveDisabledDriver(driver)}
                  className="hover:text-red-600 dark:hover:text-red-200"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-monokai-blue dark:hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? mode === 'create'
              ? 'Creating...'
              : 'Saving...'
            : mode === 'create'
              ? 'Create Namespace'
              : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default NamespaceForm;
