import { PolicyPreset, AclPolicyRules } from '../../types/acl';

/**
 * Pre-defined policy presets for common use cases
 */
export const POLICY_PRESETS: PolicyPreset[] = [
  {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to all namespaces, nodes, and agents',
    rules: {
      namespaces: [
        {
          name: '*',
          policy: 'read',
          capabilities: ['list-jobs', 'read-job'],
        },
      ],
      node: { policy: 'read' },
      agent: { policy: 'read' },
    },
  },
  {
    name: 'developer',
    displayName: 'Developer',
    description: 'Submit jobs and read logs in a specific namespace',
    rules: {
      namespaces: [
        {
          name: 'default',
          policy: 'write',
          capabilities: [
            'list-jobs',
            'parse-job',
            'read-job',
            'submit-job',
            'dispatch-job',
            'read-logs',
            'read-fs',
            'alloc-exec',
          ],
        },
        {
          name: '*',
          policy: 'read',
          capabilities: ['list-jobs', 'read-job'],
        },
      ],
      node: { policy: 'read' },
      agent: { policy: 'read' },
    },
    targetNamespace: 'default',
  },
  {
    name: 'operator',
    displayName: 'Operator',
    description: 'Developer permissions plus node management and scaling',
    rules: {
      namespaces: [
        {
          name: 'default',
          policy: 'write',
          capabilities: [
            'list-jobs',
            'parse-job',
            'read-job',
            'submit-job',
            'dispatch-job',
            'read-logs',
            'read-fs',
            'alloc-exec',
            'alloc-lifecycle',
            'scale-job',
            'list-scaling-policies',
            'read-scaling-policy',
            'read-job-scaling',
          ],
        },
        {
          name: '*',
          policy: 'read',
          capabilities: ['list-jobs', 'read-job'],
        },
      ],
      node: { policy: 'write' },
      agent: { policy: 'read' },
      operator: { policy: 'read' },
    },
    targetNamespace: 'default',
  },
  {
    name: 'admin',
    displayName: 'Admin',
    description: 'Full access to everything except ACL management',
    rules: {
      namespaces: [
        {
          name: '*',
          policy: 'write',
        },
      ],
      node: { policy: 'write' },
      agent: { policy: 'write' },
      operator: { policy: 'write' },
      quota: { policy: 'write' },
      plugin: { policy: 'write' },
    },
  },
];

/**
 * Apply a preset with a custom namespace (for developer/operator presets)
 */
export function applyPresetWithNamespace(preset: PolicyPreset, namespace: string): AclPolicyRules {
  if (!preset.targetNamespace) {
    return structuredClone(preset.rules);
  }

  const rules = structuredClone(preset.rules);

  // Replace target namespace with the specified one
  rules.namespaces = rules.namespaces.map((ns) => {
    if (ns.name === preset.targetNamespace) {
      return { ...ns, name: namespace };
    }
    return ns;
  });

  return rules;
}

/**
 * Check if a preset requires namespace selection
 */
export function presetRequiresNamespace(preset: PolicyPreset): boolean {
  return preset.targetNamespace !== undefined;
}

/**
 * Generate suggested policy name from preset
 */
export function suggestPolicyName(preset: PolicyPreset, namespace?: string): string {
  if (preset.targetNamespace && namespace) {
    return `${preset.name}-${namespace}`;
  }
  return preset.name;
}
