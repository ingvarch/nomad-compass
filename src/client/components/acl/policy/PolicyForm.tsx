import { useState, useEffect, useCallback } from 'react';
import { NomadAclPolicy, AclPolicyRules } from '../../../types/acl';
import { generateHcl, createEmptyRules } from '../../../lib/acl/hclGenerator';
import { parseHcl, validateHcl } from '../../../lib/acl/hclParser';
import { PolicyVisualEditor } from './PolicyVisualEditor';
import { PolicyHclPreview } from './PolicyHclPreview';
import { PresetSelector } from './PresetSelector';
import { FormActions } from '../../ui/FormActions';
import { useToast } from '../../../context/ToastContext';

interface PolicyFormProps {
  mode: 'create' | 'edit';
  policy?: NomadAclPolicy;
  onSubmit: (name: string, description: string, rules: string) => Promise<void>;
  onCancel: () => void;
}

export function PolicyForm({ mode, policy, onSubmit, onCancel }: PolicyFormProps) {
  const [name, setName] = useState(policy?.Name || '');
  const [description, setDescription] = useState(policy?.Description || '');
  const [rules, setRules] = useState<AclPolicyRules>(createEmptyRules());
  const [hclText, setHclText] = useState('');
  const [hclError, setHclError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingHcl, setEditingHcl] = useState(false);

  const { addToast } = useToast();

  // Initialize from existing policy
  useEffect(() => {
    if (policy?.Rules) {
      const parsed = parseHcl(policy.Rules);
      if (parsed) {
        setRules(parsed);
        setHclText(policy.Rules);
      } else {
        // If parsing fails, show raw HCL and enable edit mode
        setHclText(policy.Rules);
        setEditingHcl(true);
      }
    }
  }, [policy]);

  // Update HCL when rules change (if not editing HCL directly)
  useEffect(() => {
    if (!editingHcl) {
      const newHcl = generateHcl(rules);
      setHclText(newHcl);
      setHclError(null);
    }
  }, [rules, editingHcl]);

  const handleRulesChange = useCallback((newRules: AclPolicyRules) => {
    setRules(newRules);
    setEditingHcl(false);
  }, []);

  const handleHclChange = useCallback((newHcl: string) => {
    setHclText(newHcl);
    setEditingHcl(true);

    // Validate and try to parse
    const validation = validateHcl(newHcl);
    if (!validation.valid) {
      setHclError(validation.error || 'Invalid HCL');
      return;
    }

    const parsed = parseHcl(newHcl);
    if (parsed) {
      setRules(parsed);
      setHclError(null);
    } else {
      setHclError('Failed to parse HCL');
    }
  }, []);

  const handlePresetApply = useCallback((presetRules: AclPolicyRules) => {
    setRules(presetRules);
    setEditingHcl(false);
    setHclError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      addToast('Policy name is required', 'error');
      return;
    }

    // Validate HCL
    const validation = validateHcl(hclText);
    if (!validation.valid) {
      addToast(validation.error || 'Invalid policy rules', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name, description, hclText);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save policy';
      addToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name and Description */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Policy Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={mode === 'edit'}
            placeholder="my-policy"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
          />
          {mode === 'edit' && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Policy name cannot be changed
            </p>
          )}
        </div>
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
      </div>

      {/* Preset Selector */}
      <PresetSelector onApply={handlePresetApply} onNameSuggestion={setName} />

      {/* Two-Panel Editor */}
      <div className="grid grid-cols-2 gap-4 min-h-[400px]">
        {/* Visual Editor */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Visual Editor
            </h4>
          </div>
          <div className="p-3 max-h-[500px] overflow-y-auto">
            <PolicyVisualEditor rules={rules} onChange={handleRulesChange} />
          </div>
        </div>

        {/* HCL Preview */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              HCL Policy
            </h4>
            <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <input
                type="checkbox"
                checked={editingHcl}
                onChange={(e) => setEditingHcl(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              Edit directly
            </label>
          </div>
          <PolicyHclPreview
            hcl={hclText}
            onChange={handleHclChange}
            editable={editingHcl}
            error={hclError}
          />
        </div>
      </div>

      {/* Actions */}
      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        disabled={!!hclError}
        submitLabel={mode === 'create' ? 'Create Policy' : 'Update Policy'}
      />
    </form>
  );
}
