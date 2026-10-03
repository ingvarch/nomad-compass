import type {
  NomadCSIInfo,
  NomadCSIPlugin,
  NomadCSIPluginListStub,
  NomadCSIVolume,
  NomadCSIVolumeRegistration,
} from '../../types/csi';
import type { NomadAllocation } from '../../types/nomad';

export type CSIHealth = 'healthy' | 'degraded' | 'unschedulable';

export const ACCESS_MODES = [
  'single-node-reader-only',
  'single-node-writer',
  'multi-node-reader-only',
  'multi-node-single-writer',
  'multi-node-multi-writer',
];

export const ATTACHMENT_MODES = ['file-system', 'block-device'];

type HealthCounts = Pick<
  NomadCSIPluginListStub,
  'ControllerRequired' | 'ControllersHealthy' | 'ControllersExpected' | 'NodesHealthy' | 'NodesExpected'
> & { Schedulable?: boolean };

/**
 * Health of a volume or plugin from its plugin counts; a plugin has no Schedulable.
 */
export function csiHealth(counts: HealthCounts): CSIHealth {
  if (counts.Schedulable === false) return 'unschedulable';
  const nodesDown = counts.NodesHealthy < counts.NodesExpected;
  const controllersDown = counts.ControllerRequired && counts.ControllersHealthy < counts.ControllersExpected;
  return nodesDown || controllersDown ? 'degraded' : 'healthy';
}

export interface VolumeClaim {
  allocation: NomadAllocation;
  mode: 'read' | 'write';
}

/**
 * Allocations that use a volume, each with its claim. Nomad keys the claims by allocation ID.
 */
export function volumeClaims(volume: Pick<NomadCSIVolume, 'Allocations' | 'WriteAllocs'>): VolumeClaim[] {
  const writers = volume.WriteAllocs ?? {};
  return (volume.Allocations ?? []).map((allocation) => ({
    allocation,
    mode: allocation.ID in writers ? 'write' : 'read',
  }));
}

export function supportsSnapshots(plugin: Pick<NomadCSIPlugin, 'Controllers'>): boolean {
  return Object.values(plugin.Controllers ?? {}).some((info) => info.ControllerInfo?.SupportsCreateDeleteSnapshot);
}

export interface PluginInstance {
  type: 'controller' | 'node';
  nodeId: string;
  info: NomadCSIInfo;
}

/**
 * The running controller and node plugins, which Nomad keys by node ID.
 */
export function pluginInstances(plugin: Pick<NomadCSIPlugin, 'Controllers' | 'Nodes'>): PluginInstance[] {
  const instances = (type: PluginInstance['type'], byNode: Record<string, NomadCSIInfo> | null) =>
    Object.entries(byNode ?? {}).map(([nodeId, info]) => ({ type, nodeId, info }));
  return [...instances('controller', plugin.Controllers), ...instances('node', plugin.Nodes)];
}

export function volumePath(id: string, namespace: string): string {
  return `/storage/volumes/${encodeURIComponent(id)}?namespace=${encodeURIComponent(namespace)}`;
}

export function pluginPath(id: string): string {
  return `/storage/plugins/${encodeURIComponent(id)}`;
}

export interface RegistrationForm {
  id: string;
  name: string;
  namespace: string;
  pluginId: string;
  externalId: string;
  capabilities: { accessMode: string; attachmentMode: string }[];
  fsType: string;
  // Comma separated
  mountFlags: string;
  parameters: { key: string; value: string }[];
}

export type RegistrationErrors = Partial<Record<'id' | 'pluginId' | 'externalId' | 'capabilities', string>>;

/**
 * What Nomad rejects in a registration: no ID, plugin or external ID, or no capability.
 */
export function validateRegistration(form: RegistrationForm): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!form.id.trim()) errors.id = 'Required';
  if (!form.pluginId.trim()) errors.pluginId = 'Required';
  if (!form.externalId.trim()) errors.externalId = 'Required';
  if (form.capabilities.length === 0) errors.capabilities = 'Add at least one capability';
  return errors;
}

/**
 * Body of the registration; the name defaults to the ID, empty options and parameters are left out.
 */
export function volumeRegistration(form: RegistrationForm): NomadCSIVolumeRegistration {
  const id = form.id.trim();
  const volume: NomadCSIVolumeRegistration = {
    ID: id,
    Name: form.name.trim() || id,
    Namespace: form.namespace,
    PluginID: form.pluginId.trim(),
    ExternalID: form.externalId.trim(),
    RequestedCapabilities: form.capabilities.map((c) => ({ AccessMode: c.accessMode, AttachmentMode: c.attachmentMode })),
  };

  const mountFlags = form.mountFlags.split(',').map((flag) => flag.trim()).filter(Boolean);
  if (form.fsType.trim() || mountFlags.length > 0) {
    volume.MountOptions = { FSType: form.fsType.trim(), MountFlags: mountFlags };
  }

  const parameters = form.parameters.filter((p) => p.key.trim());
  if (parameters.length > 0) {
    volume.Parameters = Object.fromEntries(parameters.map((p) => [p.key.trim(), p.value]));
  }

  return volume;
}
