import {
  AclPolicyRules,
  NamespaceRule,
  NamespaceCapability,
  PolicyLevel,
  VariableCapability,
  NamespaceVariablesPath,
} from '../../types/acl';

/**
 * Parse HCL policy string to structured rules
 * This is a simplified parser that handles common HCL patterns
 */
export function parseHcl(hcl: string): AclPolicyRules | null {
  try {
    const rules: AclPolicyRules = { namespaces: [] };

    // Remove comments
    const cleanHcl = removeComments(hcl);

    // Parse namespace blocks
    const namespaceMatches = matchBlocks(cleanHcl, 'namespace');
    for (const match of namespaceMatches) {
      const nsRule = parseNamespaceBlock(match.label, match.body);
      if (nsRule) {
        rules.namespaces.push(nsRule);
      }
    }

    // Parse node block
    const nodeMatch = matchSingleBlock(cleanHcl, 'node');
    if (nodeMatch) {
      const policy = extractPolicy(nodeMatch.body);
      if (policy) {
        rules.node = { policy };
      }
    }

    // Parse agent block
    const agentMatch = matchSingleBlock(cleanHcl, 'agent');
    if (agentMatch) {
      const policy = extractPolicy(agentMatch.body);
      if (policy) {
        rules.agent = { policy };
      }
    }

    // Parse operator block
    const operatorMatch = matchSingleBlock(cleanHcl, 'operator');
    if (operatorMatch) {
      const policy = extractPolicy(operatorMatch.body);
      if (policy) {
        rules.operator = { policy };
      }
    }

    // Parse quota block
    const quotaMatch = matchSingleBlock(cleanHcl, 'quota');
    if (quotaMatch) {
      const policy = extractPolicy(quotaMatch.body);
      if (policy) {
        rules.quota = { policy };
      }
    }

    // Parse plugin block
    const pluginMatch = matchSingleBlock(cleanHcl, 'plugin');
    if (pluginMatch) {
      const policy = extractPolicy(pluginMatch.body);
      if (policy) {
        rules.plugin = { policy };
      }
    }

    // Parse node_pool block
    const nodePoolMatch = matchSingleBlock(cleanHcl, 'node_pool');
    if (nodePoolMatch) {
      const policy = extractPolicy(nodePoolMatch.body);
      const capabilities = extractCapabilities(nodePoolMatch.body);
      if (policy || capabilities.length > 0) {
        rules.nodePool = {
          name: nodePoolMatch.label,
          policy: policy || undefined,
          capabilities: capabilities.length > 0 ? (capabilities as any) : undefined,
        };
      }
    }

    // Parse host_volume blocks
    const hvMatches = matchBlocks(cleanHcl, 'host_volume');
    if (hvMatches.length > 0) {
      rules.hostVolumes = [];
      for (const match of hvMatches) {
        const policy = extractPolicy(match.body);
        const capabilities = extractCapabilities(match.body);
        rules.hostVolumes.push({
          name: match.label || '*',
          policy: policy || undefined,
          capabilities: capabilities.length > 0 ? (capabilities as any) : undefined,
        });
      }
    }

    return rules;
  } catch {
    return null;
  }
}

/**
 * Remove HCL comments (# and //)
 */
function removeComments(hcl: string): string {
  return hcl
    .split('\n')
    .map((line) => {
      // Remove # comments
      const hashIndex = line.indexOf('#');
      if (hashIndex !== -1) {
        line = line.substring(0, hashIndex);
      }
      // Remove // comments
      const slashIndex = line.indexOf('//');
      if (slashIndex !== -1) {
        line = line.substring(0, slashIndex);
      }
      return line;
    })
    .join('\n');
}

/**
 * Match all blocks of a given type (e.g., namespace "name" { ... })
 */
function matchBlocks(hcl: string, blockType: string): { label: string; body: string }[] {
  const results: { label: string; body: string }[] = [];

  // Match blocks with labels: blockType "label" { ... }
  const labeledRegex = new RegExp(`${blockType}\\s+"([^"]+)"\\s*\\{`, 'g');
  let match;

  while ((match = labeledRegex.exec(hcl)) !== null) {
    const label = match[1];
    const startIndex = match.index + match[0].length;
    const body = extractBlockBody(hcl, startIndex);
    if (body !== null) {
      results.push({ label, body });
    }
  }

  return results;
}

/**
 * Match a single block without label (e.g., node { ... })
 */
function matchSingleBlock(hcl: string, blockType: string): { label?: string; body: string } | null {
  // First try labeled block
  const labeledRegex = new RegExp(`${blockType}\\s+"([^"]+)"\\s*\\{`);
  let match = labeledRegex.exec(hcl);

  if (match) {
    const label = match[1];
    const startIndex = match.index + match[0].length;
    const body = extractBlockBody(hcl, startIndex);
    if (body !== null) {
      return { label, body };
    }
  }

  // Try unlabeled block
  const unlabeledRegex = new RegExp(`${blockType}\\s*\\{`);
  match = unlabeledRegex.exec(hcl);

  if (match) {
    const startIndex = match.index + match[0].length;
    const body = extractBlockBody(hcl, startIndex);
    if (body !== null) {
      return { body };
    }
  }

  return null;
}

/**
 * Extract block body between braces, handling nested braces
 */
function extractBlockBody(hcl: string, startIndex: number): string | null {
  let depth = 1;
  let endIndex = startIndex;

  while (depth > 0 && endIndex < hcl.length) {
    if (hcl[endIndex] === '{') depth++;
    else if (hcl[endIndex] === '}') depth--;
    if (depth > 0) endIndex++;
  }

  if (depth !== 0) return null;
  return hcl.substring(startIndex, endIndex);
}

/**
 * Extract policy value from block body
 */
function extractPolicy(body: string): PolicyLevel | null {
  const match = body.match(/policy\s*=\s*"([^"]+)"/);
  if (match) {
    const policy = match[1] as PolicyLevel;
    if (['read', 'write', 'deny', 'scale', 'list'].includes(policy)) {
      return policy;
    }
  }
  return null;
}

/**
 * Extract capabilities array from block body
 */
function extractCapabilities(body: string): string[] {
  const match = body.match(/capabilities\s*=\s*\[([^\]]+)\]/);
  if (match) {
    return match[1]
      .split(',')
      .map((s) => s.trim().replace(/"/g, ''))
      .filter(Boolean);
  }
  return [];
}

/**
 * Parse namespace block body
 */
function parseNamespaceBlock(name: string, body: string): NamespaceRule | null {
  const rule: NamespaceRule = { name };

  // Extract policy
  const policy = extractPolicy(body);
  if (policy) {
    rule.policy = policy;
  }

  // Extract capabilities
  const capabilities = extractCapabilities(body);
  if (capabilities.length > 0) {
    rule.capabilities = capabilities as NamespaceCapability[];
  }

  // Extract variables block
  const variablesMatch = body.match(/variables\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
  if (variablesMatch) {
    const variablesBody = variablesMatch[1];
    const pathMatches = matchBlocks(variablesBody, 'path');

    if (pathMatches.length > 0) {
      rule.variables = [];
      for (const pathMatch of pathMatches) {
        const pathCapabilities = extractCapabilities(pathMatch.body);
        if (pathCapabilities.length > 0) {
          rule.variables.push({
            path: pathMatch.label,
            capabilities: pathCapabilities as VariableCapability[],
          } as NamespaceVariablesPath);
        }
      }
    }
  }

  return rule;
}

/**
 * Validate HCL and return error message if invalid
 */
export function validateHcl(hcl: string): { valid: boolean; error?: string } {
  if (!hcl || hcl.trim() === '') {
    return { valid: false, error: 'Policy rules cannot be empty' };
  }

  // Check for balanced braces
  let depth = 0;
  let lineNum = 1;
  for (let i = 0; i < hcl.length; i++) {
    if (hcl[i] === '\n') lineNum++;
    if (hcl[i] === '{') depth++;
    else if (hcl[i] === '}') depth--;
    if (depth < 0) {
      return { valid: false, error: `Unexpected closing brace at line ${lineNum}` };
    }
  }

  if (depth > 0) {
    return { valid: false, error: `Missing ${depth} closing brace(s)` };
  }

  // Try to parse
  const rules = parseHcl(hcl);
  if (!rules) {
    return { valid: false, error: 'Failed to parse HCL syntax' };
  }

  // Check if at least one rule was parsed
  const hasRules =
    rules.namespaces.length > 0 ||
    rules.node ||
    rules.agent ||
    rules.operator ||
    rules.quota ||
    rules.plugin ||
    rules.nodePool ||
    (rules.hostVolumes && rules.hostVolumes.length > 0);

  if (!hasRules) {
    return { valid: false, error: 'No valid policy rules found' };
  }

  return { valid: true };
}
