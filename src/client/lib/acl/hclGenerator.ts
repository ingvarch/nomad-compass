import {
  AclPolicyRules,
  NamespaceRule,
  HostVolumeRule,
  NodePoolRule,
} from '../../types/acl';

/**
 * Generate HCL policy string from structured rules
 */
export function generateHcl(rules: AclPolicyRules): string {
  const blocks: string[] = [];

  // Namespace rules
  for (const ns of rules.namespaces) {
    const block = generateNamespaceBlock(ns);
    if (block) {
      blocks.push(block);
    }
  }

  // Node rule
  if (rules.node) {
    blocks.push(`node {\n  policy = "${rules.node.policy}"\n}`);
  }

  // Node pool rule
  if (rules.nodePool) {
    const block = generateNodePoolBlock(rules.nodePool);
    if (block) {
      blocks.push(block);
    }
  }

  // Agent rule
  if (rules.agent) {
    blocks.push(`agent {\n  policy = "${rules.agent.policy}"\n}`);
  }

  // Operator rule
  if (rules.operator) {
    blocks.push(`operator {\n  policy = "${rules.operator.policy}"\n}`);
  }

  // Quota rule
  if (rules.quota) {
    blocks.push(`quota {\n  policy = "${rules.quota.policy}"\n}`);
  }

  // Plugin rule
  if (rules.plugin) {
    blocks.push(`plugin {\n  policy = "${rules.plugin.policy}"\n}`);
  }

  // Host volume rules
  if (rules.hostVolumes?.length) {
    for (const hv of rules.hostVolumes) {
      const block = generateHostVolumeBlock(hv);
      if (block) {
        blocks.push(block);
      }
    }
  }

  return blocks.join('\n\n');
}

/**
 * Generate a namespace block
 */
function generateNamespaceBlock(ns: NamespaceRule): string {
  const lines: string[] = [];
  lines.push(`namespace "${ns.name}" {`);

  if (ns.policy) {
    lines.push(`  policy = "${ns.policy}"`);
  }

  if (ns.capabilities?.length) {
    const caps = ns.capabilities.map((c) => `"${c}"`).join(', ');
    lines.push(`  capabilities = [${caps}]`);
  }

  if (ns.variables?.length) {
    lines.push('  variables {');
    for (const v of ns.variables) {
      lines.push(`    path "${v.path}" {`);
      const varCaps = v.capabilities.map((c) => `"${c}"`).join(', ');
      lines.push(`      capabilities = [${varCaps}]`);
      lines.push('    }');
    }
    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate a node pool block
 */
function generateNodePoolBlock(np: NodePoolRule): string | null {
  if (!np.policy && (!np.capabilities || np.capabilities.length === 0)) {
    return null;
  }

  const lines: string[] = [];
  const label = np.name ? `"${np.name}"` : '';
  lines.push(`node_pool ${label}{`.replace('  ', ' ').trim());

  if (np.policy) {
    lines.push(`  policy = "${np.policy}"`);
  }

  if (np.capabilities?.length) {
    const caps = np.capabilities.map((c) => `"${c}"`).join(', ');
    lines.push(`  capabilities = [${caps}]`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate a host volume block
 */
function generateHostVolumeBlock(hv: HostVolumeRule): string | null {
  if (!hv.policy && (!hv.capabilities || hv.capabilities.length === 0)) {
    return null;
  }

  const lines: string[] = [];
  lines.push(`host_volume "${hv.name}" {`);

  if (hv.policy) {
    lines.push(`  policy = "${hv.policy}"`);
  }

  if (hv.capabilities?.length) {
    const caps = hv.capabilities.map((c) => `"${c}"`).join(', ');
    lines.push(`  capabilities = [${caps}]`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Create empty policy rules structure
 */
export function createEmptyRules(): AclPolicyRules {
  return {
    namespaces: [],
  };
}

/**
 * Create a new namespace rule with defaults
 */
export function createNamespaceRule(name: string = '*'): NamespaceRule {
  return {
    name,
    policy: 'read',
    capabilities: [],
  };
}
