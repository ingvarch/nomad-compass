import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal, Button, ErrorAlert } from '../ui';
import { FieldError, OptionalMark } from '../ui/forms/FieldHints';
import { createNomadClient } from '../../lib/api/nomad';
import { getErrorMessage } from '../../lib/errors';
import { useFetch } from '../../hooks/useFetch';
import {
  ACCESS_MODES,
  ATTACHMENT_MODES,
  validateRegistration,
  volumeRegistration,
  type RegistrationForm,
} from '../../lib/services/csiService';
import { buttonAddRowStyles, inputErrorStyles, inputStyles, labelStyles, selectStyles } from '../../lib/styles';
import type { NomadCSIPluginListStub, NomadCSIVolumeRegistration } from '../../types/csi';

interface RegisterVolumeModalProps {
  plugins: NomadCSIPluginListStub[];
  onClose: () => void;
  onRegister: (volume: NomadCSIVolumeRegistration) => Promise<void>;
}

const removeButtonStyles =
  'shrink-0 inline-flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Registers a volume that already exists at the storage provider, the way `nomad volume register` does.
 */
export function RegisterVolumeModal({ plugins, onClose, onRegister }: RegisterVolumeModalProps) {
  const [form, setForm] = useState<RegistrationForm>({
    id: '',
    name: '',
    namespace: 'default',
    pluginId: plugins[0]?.ID ?? '',
    externalId: '',
    capabilities: [{ accessMode: 'single-node-writer', attachmentMode: 'file-system' }],
    fsType: '',
    mountFlags: '',
    parameters: [],
  });
  // Errors show only after the first attempt to register
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const namespaces = useFetch<string[]>(
    async () => (await createNomadClient().getNamespaces()).map((ns) => ns.Name),
    [],
    { initialData: ['default'] }
  );

  const errors = attempted ? validateRegistration(form) : {};
  const update = (changes: Partial<RegistrationForm>) => setForm((prev) => ({ ...prev, ...changes }));

  const updateCapability = (index: number, changes: Partial<RegistrationForm['capabilities'][number]>) =>
    update({ capabilities: form.capabilities.map((c, i) => (i === index ? { ...c, ...changes } : c)) });

  const updateParameter = (index: number, changes: Partial<RegistrationForm['parameters'][number]>) =>
    update({ parameters: form.parameters.map((p, i) => (i === index ? { ...p, ...changes } : p)) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (Object.keys(validateRegistration(form)).length > 0 || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await onRegister(volumeRegistration(form));
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to register volume', 'register-volume'));
      setIsSubmitting(false);
    }
  };

  const textField = (id: string, label: React.ReactNode, key: 'id' | 'name' | 'externalId' | 'fsType' | 'mountFlags', options: { error?: string; hint?: string; mono?: boolean } = {}) => (
    <div>
      <label htmlFor={id} className={labelStyles}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={form[key]}
        onChange={(e) => update({ [key]: e.target.value })}
        disabled={isSubmitting}
        className={`${options.error ? inputErrorStyles : inputStyles} ${options.mono ? 'font-mono' : ''}`}
      />
      {options.hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{options.hint}</p>}
      <FieldError message={options.error} />
    </div>
  );

  return (
    <Modal isOpen onClose={onClose} title="Register Volume" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <ErrorAlert message={error} />}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Registers a volume that already exists at the storage provider, so jobs can claim it.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {textField('volume-id', 'Volume ID', 'id', { error: errors.id, mono: true })}
          {textField('volume-name', <>Name <OptionalMark /></>, 'name', { hint: 'The volume ID when empty' })}
          <div>
            <label htmlFor="volume-namespace" className={labelStyles}>
              Namespace
            </label>
            <select
              id="volume-namespace"
              value={form.namespace}
              onChange={(e) => update({ namespace: e.target.value })}
              disabled={isSubmitting}
              className={selectStyles}
            >
              {(namespaces.data ?? ['default']).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="volume-plugin" className={labelStyles}>
              Plugin
            </label>
            <select
              id="volume-plugin"
              value={form.pluginId}
              onChange={(e) => update({ pluginId: e.target.value })}
              disabled={isSubmitting}
              className={errors.pluginId ? inputErrorStyles : selectStyles}
            >
              {plugins.length === 0 && <option value="">No CSI plugin runs</option>}
              {plugins.map((plugin) => (
                <option key={plugin.ID} value={plugin.ID}>
                  {plugin.ID}
                </option>
              ))}
            </select>
            <FieldError message={errors.pluginId} />
          </div>
        </div>

        {textField('volume-external-id', 'External ID', 'externalId', {
          error: errors.externalId,
          hint: 'The ID of the volume at the storage provider, like vol-0a1b2c3d for AWS EBS.',
          mono: true,
        })}

        <fieldset className="space-y-2">
          <legend className={labelStyles}>Capabilities</legend>
          {form.capabilities.map((capability, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                aria-label={`Access mode ${i + 1}`}
                value={capability.accessMode}
                onChange={(e) => updateCapability(i, { accessMode: e.target.value })}
                disabled={isSubmitting}
                className={`${selectStyles} font-mono text-sm`}
              >
                {ACCESS_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
              <select
                aria-label={`Attachment mode ${i + 1}`}
                value={capability.attachmentMode}
                onChange={(e) => updateCapability(i, { attachmentMode: e.target.value })}
                disabled={isSubmitting}
                className={`${selectStyles} font-mono text-sm`}
              >
                {ATTACHMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`Remove capability ${i + 1}`}
                onClick={() => update({ capabilities: form.capabilities.filter((_, j) => j !== i) })}
                disabled={isSubmitting}
                className={removeButtonStyles}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <FieldError message={errors.capabilities} />
          <button
            type="button"
            onClick={() => update({ capabilities: [...form.capabilities, { accessMode: 'single-node-writer', attachmentMode: 'file-system' }] })}
            disabled={isSubmitting}
            className={buttonAddRowStyles}
          >
            <Plus className="w-4 h-4" />
            Add capability
          </button>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          {textField('volume-fs-type', <>File system <OptionalMark /></>, 'fsType', { hint: 'Like ext4 or xfs', mono: true })}
          {textField('volume-mount-flags', <>Mount flags <OptionalMark /></>, 'mountFlags', { hint: 'Comma separated, like noatime', mono: true })}
        </div>

        <fieldset className="space-y-2">
          <legend className={labelStyles}>
            Parameters <OptionalMark />
          </legend>
          {form.parameters.map((parameter, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                aria-label={`Parameter key ${i + 1}`}
                placeholder="key"
                value={parameter.key}
                onChange={(e) => updateParameter(i, { key: e.target.value })}
                disabled={isSubmitting}
                className={`${inputStyles} font-mono text-sm`}
              />
              <input
                aria-label={`Parameter value ${i + 1}`}
                placeholder="value"
                value={parameter.value}
                onChange={(e) => updateParameter(i, { value: e.target.value })}
                disabled={isSubmitting}
                className={`${inputStyles} font-mono text-sm`}
              />
              <button
                type="button"
                aria-label={`Remove parameter ${i + 1}`}
                onClick={() => update({ parameters: form.parameters.filter((_, j) => j !== i) })}
                disabled={isSubmitting}
                className={removeButtonStyles}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update({ parameters: [...form.parameters, { key: '', value: '' }] })}
            disabled={isSubmitting}
            className={buttonAddRowStyles}
          >
            <Plus className="w-4 h-4" />
            Add parameter
          </button>
        </fieldset>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Register
          </Button>
        </div>
      </form>
    </Modal>
  );
}
