import type { NamespaceCapability, PolicyLevel } from '../../types/acl';

// Capability groups for visual editor
export interface CapabilityGroup {
  name: string;
  capabilities: {
    value: NamespaceCapability;
    label: string;
    description?: string;
  }[];
}

export const NAMESPACE_CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    name: 'Jobs',
    capabilities: [
      { value: 'list-jobs', label: 'List', description: 'List jobs in namespace' },
      { value: 'parse-job', label: 'Parse', description: 'Parse job specifications' },
      { value: 'read-job', label: 'Read', description: 'Read job details' },
      { value: 'submit-job', label: 'Submit', description: 'Submit new jobs' },
      { value: 'dispatch-job', label: 'Dispatch', description: 'Dispatch parameterized jobs' },
    ],
  },
  {
    name: 'Logs & Filesystem',
    capabilities: [
      { value: 'read-logs', label: 'Logs', description: 'Read allocation logs' },
      { value: 'read-fs', label: 'Filesystem', description: 'Read allocation filesystem' },
    ],
  },
  {
    name: 'Allocations',
    capabilities: [
      { value: 'alloc-exec', label: 'Exec', description: 'Execute commands in allocations' },
      {
        value: 'alloc-node-exec',
        label: 'Node Exec',
        description: 'Execute commands on node (privileged)',
      },
      {
        value: 'alloc-lifecycle',
        label: 'Lifecycle',
        description: 'Restart/stop allocations',
      },
    ],
  },
  {
    name: 'CSI Volumes',
    capabilities: [
      { value: 'csi-list-volume', label: 'List', description: 'List CSI volumes' },
      { value: 'csi-read-volume', label: 'Read', description: 'Read CSI volume details' },
      { value: 'csi-write-volume', label: 'Write', description: 'Create/update CSI volumes' },
      { value: 'csi-mount-volume', label: 'Mount', description: 'Mount CSI volumes' },
      {
        value: 'csi-register-plugin',
        label: 'Register Plugin',
        description: 'Register CSI plugins',
      },
    ],
  },
  {
    name: 'Scaling',
    capabilities: [
      {
        value: 'list-scaling-policies',
        label: 'List Policies',
        description: 'List scaling policies',
      },
      {
        value: 'read-scaling-policy',
        label: 'Read Policy',
        description: 'Read scaling policy details',
      },
      { value: 'read-job-scaling', label: 'Read Job Scaling', description: 'Read job scaling info' },
      { value: 'scale-job', label: 'Scale', description: 'Scale jobs up/down' },
      {
        value: 'submit-recommendation',
        label: 'Recommendations',
        description: 'Submit scaling recommendations',
      },
    ],
  },
  {
    name: 'Security',
    capabilities: [
      {
        value: 'sentinel-override',
        label: 'Sentinel Override',
        description: 'Override Sentinel policies',
      },
    ],
  },
];

// Global rule options
export const GLOBAL_POLICY_OPTIONS: { value: PolicyLevel; label: string }[] = [
  { value: 'deny', label: 'Deny' },
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
];

export const NAMESPACE_POLICY_OPTIONS: { value: PolicyLevel; label: string }[] = [
  { value: 'deny', label: 'Deny' },
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'scale', label: 'Scale' },
];
