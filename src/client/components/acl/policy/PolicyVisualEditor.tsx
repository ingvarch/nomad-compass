import { useCallback } from 'react';
import {
  AclPolicyRules,
  NamespaceRule,
  PolicyLevel,
  GLOBAL_POLICY_OPTIONS,
} from '../../../types/acl';
import { NamespaceRuleRow } from './rules/NamespaceRuleRow';
import { GlobalRuleRow } from './rules/GlobalRuleRow';
import { createNamespaceRule } from '../../../lib/acl/hclGenerator';

interface PolicyVisualEditorProps {
  rules: AclPolicyRules;
  onChange: (rules: AclPolicyRules) => void;
}

export function PolicyVisualEditor({ rules, onChange }: PolicyVisualEditorProps) {
  // Namespace handlers
  const handleAddNamespace = useCallback(() => {
    const newNs = createNamespaceRule('*');
    onChange({
      ...rules,
      namespaces: [...rules.namespaces, newNs],
    });
  }, [rules, onChange]);

  const handleNamespaceChange = useCallback(
    (index: number, updated: NamespaceRule) => {
      const newNamespaces = [...rules.namespaces];
      newNamespaces[index] = updated;
      onChange({ ...rules, namespaces: newNamespaces });
    },
    [rules, onChange]
  );

  const handleRemoveNamespace = useCallback(
    (index: number) => {
      const newNamespaces = rules.namespaces.filter((_, i) => i !== index);
      onChange({ ...rules, namespaces: newNamespaces });
    },
    [rules, onChange]
  );

  // Global rule handlers
  const handleGlobalRuleChange = useCallback(
    (ruleType: 'node' | 'agent' | 'operator' | 'quota' | 'plugin', policy: PolicyLevel | null) => {
      const newRules = { ...rules };
      if (policy === null) {
        delete newRules[ruleType];
      } else {
        newRules[ruleType] = { policy };
      }
      onChange(newRules);
    },
    [rules, onChange]
  );

  return (
    <div className="space-y-6">
      {/* Namespace Rules */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Namespace Rules
          </h5>
          <button
            type="button"
            onClick={handleAddNamespace}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Namespace
          </button>
        </div>

        {rules.namespaces.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            No namespace rules.{' '}
            <button
              type="button"
              onClick={handleAddNamespace}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Add one
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.namespaces.map((ns, index) => (
              <NamespaceRuleRow
                key={index}
                rule={ns}
                onChange={(updated) => handleNamespaceChange(index, updated)}
                onRemove={() => handleRemoveNamespace(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Global Rules */}
      <div>
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Global Rules
        </h5>
        <div className="grid grid-cols-2 gap-3">
          <GlobalRuleRow
            label="Node"
            description="Access to nodes API"
            value={rules.node?.policy || null}
            options={GLOBAL_POLICY_OPTIONS}
            onChange={(policy) => handleGlobalRuleChange('node', policy)}
          />
          <GlobalRuleRow
            label="Agent"
            description="Access to agent API"
            value={rules.agent?.policy || null}
            options={GLOBAL_POLICY_OPTIONS}
            onChange={(policy) => handleGlobalRuleChange('agent', policy)}
          />
          <GlobalRuleRow
            label="Operator"
            description="Cluster operations"
            value={rules.operator?.policy || null}
            options={GLOBAL_POLICY_OPTIONS}
            onChange={(policy) => handleGlobalRuleChange('operator', policy)}
          />
          <GlobalRuleRow
            label="Quota"
            description="Quota management"
            value={rules.quota?.policy || null}
            options={GLOBAL_POLICY_OPTIONS}
            onChange={(policy) => handleGlobalRuleChange('quota', policy)}
          />
          <GlobalRuleRow
            label="Plugin"
            description="CSI plugins access"
            value={rules.plugin?.policy || null}
            options={GLOBAL_POLICY_OPTIONS}
            onChange={(policy) => handleGlobalRuleChange('plugin', policy)}
          />
        </div>
      </div>
    </div>
  );
}
