import { useState } from 'react';
import {
  NamespaceRule,
  PolicyLevel,
  NamespaceCapability,
  NAMESPACE_POLICY_OPTIONS,
  NAMESPACE_CAPABILITY_GROUPS,
} from '../../../../types/acl';

interface NamespaceRuleRowProps {
  rule: NamespaceRule;
  onChange: (rule: NamespaceRule) => void;
  onRemove: () => void;
}

export function NamespaceRuleRow({ rule, onChange, onRemove }: NamespaceRuleRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleNameChange = (name: string) => {
    onChange({ ...rule, name });
  };

  const handlePolicyChange = (policy: PolicyLevel) => {
    onChange({ ...rule, policy });
  };

  const handleCapabilityToggle = (capability: NamespaceCapability) => {
    const currentCaps = rule.capabilities || [];
    const newCaps = currentCaps.includes(capability)
      ? currentCaps.filter((c) => c !== capability)
      : [...currentCaps, capability];
    onChange({ ...rule, capabilities: newCaps });
  };

  const hasCapability = (capability: NamespaceCapability) => {
    return rule.capabilities?.includes(capability) || false;
  };

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        <input
          type="text"
          value={rule.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="namespace name or *"
          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />

        <select
          value={rule.policy || ''}
          onChange={(e) => handlePolicyChange(e.target.value as PolicyLevel)}
          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">No policy</option>
          {NAMESPACE_POLICY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          title="Remove namespace rule"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Capabilities (expanded) */}
      {expanded && (
        <div className="px-3 py-3 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Fine-grained capabilities (optional, in addition to policy level):
          </p>
          {NAMESPACE_CAPABILITY_GROUPS.map((group) => (
            <div key={group.name}>
              <h6 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {group.name}
              </h6>
              <div className="flex flex-wrap gap-2">
                {group.capabilities.map((cap) => (
                  <label
                    key={cap.value}
                    className="inline-flex items-center gap-1.5 text-xs cursor-pointer"
                    title={cap.description}
                  >
                    <input
                      type="checkbox"
                      checked={hasCapability(cap.value)}
                      onChange={() => handleCapabilityToggle(cap.value)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{cap.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
