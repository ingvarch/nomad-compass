// ACL Policy capability types

export type NamespaceCapability =
  | 'deny'
  | 'list-jobs'
  | 'parse-job'
  | 'read-job'
  | 'submit-job'
  | 'dispatch-job'
  | 'read-logs'
  | 'read-fs'
  | 'alloc-exec'
  | 'alloc-node-exec'
  | 'alloc-lifecycle'
  | 'csi-register-plugin'
  | 'csi-write-volume'
  | 'csi-read-volume'
  | 'csi-list-volume'
  | 'csi-mount-volume'
  | 'list-scaling-policies'
  | 'read-scaling-policy'
  | 'read-job-scaling'
  | 'scale-job'
  | 'submit-recommendation'
  | 'sentinel-override';

export type PolicyLevel = 'read' | 'write' | 'deny' | 'scale' | 'list';

export type NodePoolCapability = 'read' | 'write' | 'delete' | 'deny';

export type HostVolumeCapability = 'mount-readonly' | 'mount-readwrite' | 'deny';

export type VariableCapability = 'read' | 'write' | 'destroy' | 'list' | 'deny';

// Namespace variables path rule
export interface NamespaceVariablesPath {
  path: string;
  capabilities: VariableCapability[];
}

// Namespace rule
export interface NamespaceRule {
  name: string; // namespace name or glob pattern like "*"
  policy?: PolicyLevel;
  capabilities?: NamespaceCapability[];
  variables?: NamespaceVariablesPath[];
}

// Global rules - simple policy-only rules share a common type
type SimplePolicyRule = { policy: PolicyLevel };

export type NodeRule = SimplePolicyRule;
export type AgentRule = SimplePolicyRule;
export type OperatorRule = SimplePolicyRule;
export type QuotaRule = SimplePolicyRule;
export type PluginRule = SimplePolicyRule;

export interface NodePoolRule {
  name?: string; // pool name or glob
  policy?: PolicyLevel;
  capabilities?: NodePoolCapability[];
}

export interface HostVolumeRule {
  name: string; // volume name or glob
  policy?: PolicyLevel;
  capabilities?: HostVolumeCapability[];
}

// Complete policy rules structure
export interface AclPolicyRules {
  namespaces: NamespaceRule[];
  node?: NodeRule;
  nodePool?: NodePoolRule;
  agent?: AgentRule;
  operator?: OperatorRule;
  quota?: QuotaRule;
  plugin?: PluginRule;
  hostVolumes?: HostVolumeRule[];
}

// API response types
export interface NomadAclPolicy {
  Name: string;
  Description?: string;
  Rules: string; // HCL string
  CreateIndex?: number;
  ModifyIndex?: number;
}

export interface NomadAclPolicyListItem {
  Name: string;
  Description?: string;
  CreateIndex: number;
  ModifyIndex: number;
}

export interface NomadAclRole {
  ID: string;
  Name: string;
  Description?: string;
  Policies: { Name: string }[];
  CreateIndex?: number;
  ModifyIndex?: number;
}

export interface NomadAclRoleListItem {
  ID: string;
  Name: string;
  Description?: string;
  Policies: { Name: string }[];
  CreateIndex: number;
  ModifyIndex: number;
}

export type TokenType = 'client' | 'management';

export interface NomadAclToken {
  AccessorID: string;
  SecretID?: string; // Only returned on creation
  Name: string;
  Type: TokenType;
  Policies?: string[];
  Roles?: { ID: string; Name: string }[];
  Global: boolean;
  ExpirationTime?: string;
  ExpirationTTL?: string;
  CreateTime?: string;
  CreateIndex?: number;
  ModifyIndex?: number;
}

export interface NomadAclTokenListItem {
  AccessorID: string;
  Name: string;
  Type: TokenType;
  Policies?: string[];
  Roles?: { ID: string; Name: string }[];
  Global: boolean;
  ExpirationTime?: string;
  CreateTime?: string;
  CreateIndex: number;
  ModifyIndex: number;
}

// Preset types
export type PresetName = 'viewer' | 'developer' | 'operator' | 'admin';

export interface PolicyPreset {
  name: PresetName;
  displayName: string;
  description: string;
  rules: AclPolicyRules;
  targetNamespace?: string; // For developer/operator presets
}

