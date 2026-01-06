import { useState, useEffect } from 'react';
import { AclPolicyRules, PolicyPreset } from '../../../types/acl';
import {
  POLICY_PRESETS,
  applyPresetWithNamespace,
  presetRequiresNamespace,
  suggestPolicyName,
} from '../../../lib/acl/policyPresets';
import { createNomadClient } from '../../../lib/api/nomad';
import { NomadNamespace } from '../../../types/nomad';

interface PresetSelectorProps {
  onApply: (rules: AclPolicyRules) => void;
  onNameSuggestion: (name: string) => void;
}

export function PresetSelector({ onApply, onNameSuggestion }: PresetSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<PolicyPreset | null>(null);
  const [namespace, setNamespace] = useState('default');
  const [namespaces, setNamespaces] = useState<NomadNamespace[]>([]);

  // Fetch namespaces for dropdown
  useEffect(() => {
    const fetchNamespaces = async () => {
      const client = createNomadClient();
      try {
        const ns = await client.getNamespaces();
        setNamespaces(ns);
      } catch {
        // Fallback to default
        setNamespaces([{ Name: 'default' }]);
      }
    };
    fetchNamespaces();
  }, []);

  const handlePresetSelect = (presetName: string) => {
    if (!presetName) {
      setSelectedPreset(null);
      return;
    }

    const preset = POLICY_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setSelectedPreset(preset);

      // If preset doesn't require namespace, apply immediately
      if (!presetRequiresNamespace(preset)) {
        onApply(preset.rules);
        onNameSuggestion(suggestPolicyName(preset));
      }
    }
  };

  const handleApplyPreset = () => {
    if (!selectedPreset) return;

    if (presetRequiresNamespace(selectedPreset)) {
      const rules = applyPresetWithNamespace(selectedPreset, namespace);
      onApply(rules);
      onNameSuggestion(suggestPolicyName(selectedPreset, namespace));
    } else {
      onApply(selectedPreset.rules);
      onNameSuggestion(suggestPolicyName(selectedPreset));
    }

    // Reset selection
    setSelectedPreset(null);
  };

  return (
    <div className="flex items-end gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Start from preset
        </label>
        <select
          value={selectedPreset?.name || ''}
          onChange={(e) => handlePresetSelect(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Select a preset...</option>
          {POLICY_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {preset.displayName} - {preset.description}
            </option>
          ))}
        </select>
      </div>

      {selectedPreset && presetRequiresNamespace(selectedPreset) && (
        <div className="w-48">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Target namespace
          </label>
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {namespaces.map((ns) => (
              <option key={ns.Name} value={ns.Name}>
                {ns.Name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedPreset && presetRequiresNamespace(selectedPreset) && (
        <button
          type="button"
          onClick={handleApplyPreset}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          Apply
        </button>
      )}
    </div>
  );
}
