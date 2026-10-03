import { describe, test, expect } from 'bun:test';
import {
  ACCESS_MODES,
  ATTACHMENT_MODES,
  csiHealth,
  pluginInstances,
  pluginPath,
  supportsSnapshots,
  validateRegistration,
  volumeClaims,
  volumePath,
  volumeRegistration,
  type RegistrationForm,
} from './csiService';
import type { NomadCSIInfo, NomadCSIPlugin, NomadCSIVolume } from '../../types/csi';
import type { NomadAllocation } from '../../types/nomad';

const healthy = {
  Schedulable: true, ControllerRequired: true,
  ControllersHealthy: 1, ControllersExpected: 1, NodesHealthy: 2, NodesExpected: 2,
};

describe('csiHealth', () => {
  test('is healthy when every controller and node plugin is healthy', () => {
    expect(csiHealth(healthy)).toBe('healthy');
  });

  test('is degraded when a node or a required controller plugin is down', () => {
    expect(csiHealth({ ...healthy, NodesHealthy: 1 })).toBe('degraded');
    expect(csiHealth({ ...healthy, ControllersHealthy: 0 })).toBe('degraded');
  });

  test('ignores controllers that the plugin does not need', () => {
    expect(csiHealth({ ...healthy, ControllerRequired: false, ControllersHealthy: 0, ControllersExpected: 0 })).toBe('healthy');
  });

  // A plugin stub has no Schedulable
  test('is unschedulable when Nomad cannot place the volume', () => {
    expect(csiHealth({ ...healthy, Schedulable: false })).toBe('unschedulable');
  });
});

describe('volumeClaims', () => {
  const alloc = (id: string) => ({ ID: id, JobID: 'example' }) as NomadAllocation;

  test('pairs each allocation with its read or write claim', () => {
    const volume = {
      Allocations: [alloc('a1'), alloc('a2')],
      ReadAllocs: { a1: null },
      WriteAllocs: { a2: null },
    } as unknown as NomadCSIVolume;

    expect(volumeClaims(volume).map((c) => [c.allocation.ID, c.mode])).toEqual([
      ['a1', 'read'],
      ['a2', 'write'],
    ]);
  });

  // Nomad sends null for an empty list or map
  test('is empty for a volume without claims', () => {
    expect(volumeClaims({ Allocations: null, ReadAllocs: null, WriteAllocs: null } as unknown as NomadCSIVolume)).toEqual([]);
  });
});

describe('plugins', () => {
  const info = (overrides: Partial<NomadCSIInfo>): NomadCSIInfo => ({
    PluginID: 'hostpath-plugin0', AllocID: 'alloc-1', Healthy: true, HealthDescription: 'healthy',
    UpdateTime: '2026-10-03T10:38:59Z', ...overrides,
  });

  test('knows whether a controller can snapshot volumes', () => {
    const snapshotting = info({ ControllerInfo: { SupportsCreateDeleteSnapshot: true } as NomadCSIInfo['ControllerInfo'] });
    expect(supportsSnapshots({ Controllers: { n1: snapshotting } } as unknown as NomadCSIPlugin)).toBe(true);
    expect(supportsSnapshots({ Controllers: { n1: info({}) } } as unknown as NomadCSIPlugin)).toBe(false);
    expect(supportsSnapshots({ Controllers: null } as unknown as NomadCSIPlugin)).toBe(false);
  });

  test('lists the controller and node plugins by node', () => {
    const plugin = {
      Controllers: { 'node-a': info({ AllocID: 'c1' }) },
      Nodes: { 'node-a': info({ AllocID: 'n1' }), 'node-b': info({ AllocID: 'n2', Healthy: false }) },
    } as unknown as NomadCSIPlugin;

    expect(pluginInstances(plugin).map((i) => [i.type, i.nodeId, i.info.AllocID])).toEqual([
      ['controller', 'node-a', 'c1'],
      ['node', 'node-a', 'n1'],
      ['node', 'node-b', 'n2'],
    ]);
    expect(pluginInstances({ Controllers: null, Nodes: null } as unknown as NomadCSIPlugin)).toEqual([]);
  });
});

describe('paths', () => {
  test('encode volume and plugin IDs', () => {
    expect(volumePath('test-volume[0]', 'prod')).toBe('/storage/volumes/test-volume%5B0%5D?namespace=prod');
    expect(pluginPath('hostpath-plugin0')).toBe('/storage/plugins/hostpath-plugin0');
  });
});

describe('volume registration', () => {
  const form: RegistrationForm = {
    id: ' postgres-data ',
    name: '',
    namespace: 'prod',
    pluginId: 'aws-ebs',
    externalId: ' vol-0abc ',
    capabilities: [{ accessMode: 'single-node-writer', attachmentMode: 'file-system' }],
    fsType: '',
    mountFlags: '',
    parameters: [],
  };

  test('offers the modes of Nomad', () => {
    expect(ACCESS_MODES).toEqual([
      'single-node-reader-only',
      'single-node-writer',
      'multi-node-reader-only',
      'multi-node-single-writer',
      'multi-node-multi-writer',
    ]);
    expect(ATTACHMENT_MODES).toEqual(['file-system', 'block-device']);
  });

  test('builds the volume, named after its ID when no name is set', () => {
    expect(volumeRegistration(form)).toEqual({
      ID: 'postgres-data',
      Name: 'postgres-data',
      Namespace: 'prod',
      PluginID: 'aws-ebs',
      ExternalID: 'vol-0abc',
      RequestedCapabilities: [{ AccessMode: 'single-node-writer', AttachmentMode: 'file-system' }],
    });
  });

  test('adds mount options and parameters when set', () => {
    const volume = volumeRegistration({
      ...form,
      fsType: 'ext4',
      mountFlags: 'noatime, nodiratime',
      parameters: [{ key: 'type', value: 'gp3' }, { key: '', value: '' }],
    });

    expect(volume.MountOptions).toEqual({ FSType: 'ext4', MountFlags: ['noatime', 'nodiratime'] });
    expect(volume.Parameters).toEqual({ type: 'gp3' });
  });

  test('asks for the fields Nomad requires', () => {
    expect(validateRegistration(form)).toEqual({});
    expect(validateRegistration({ ...form, id: ' ', pluginId: '', externalId: '', capabilities: [] })).toEqual({
      id: 'Required',
      pluginId: 'Required',
      externalId: 'Required',
      capabilities: 'Add at least one capability',
    });
  });
});
