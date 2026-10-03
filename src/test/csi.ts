// CSI volumes and plugins as a Nomad 2.0.7 lab with the hostpath plugin returned them

export const claimedVolume = {
  ID: 'test-volume[0]', Namespace: 'default', Name: 'test-volume[0]', ExternalID: 'ab043e6d-bf16-11f1-9c6b-a26241bf9398',
  Topologies: [null, { Segments: { 'topology.hostpath.csi/node': 'node-0' } }],
  AccessMode: 'single-node-reader-only', AttachmentMode: 'file-system', CurrentReaders: 1, CurrentWriters: 0,
  Schedulable: true, PluginID: 'hostpath-plugin0', Provider: 'csi-hostpath', ControllerRequired: true,
  ControllersHealthy: 1, ControllersExpected: 1, NodesHealthy: 1, NodesExpected: 1, ResourceExhausted: null,
  CreateIndex: 30, ModifyIndex: 40,
};

export const unclaimedVolume = {
  ...claimedVolume, ID: 'postgres-data', Name: 'postgres-data', Namespace: 'prod', AccessMode: '', AttachmentMode: '',
  CurrentReaders: 0, CurrentWriters: 0, Schedulable: false,
};

const { CurrentReaders: _readers, CurrentWriters: _writers, ...volumeFields } = claimedVolume;

export const volumeDetail = {
  ...volumeFields,
  Capacity: 1000000, RequestedCapacityMin: 1000000, RequestedCapacityMax: 1000000000,
  RequestedCapabilities: [
    { AccessMode: 'single-node-reader-only', AttachmentMode: 'file-system' },
    { AccessMode: 'single-node-writer', AttachmentMode: 'file-system' },
  ],
  MountOptions: { FSType: '', MountFlags: ['[REDACTED]'] },
  Secrets: null, Parameters: {}, Context: {}, ProviderVersion: 'v1.9.0', CloneID: '', SnapshotID: '',
  ReadAllocs: { '4f0816ac-2691-69de-d06e-9618da177713': null },
  WriteAllocs: {},
  Allocations: [
    {
      ID: '4f0816ac-2691-69de-d06e-9618da177713', Name: 'example.cache[0]', Namespace: 'default', JobID: 'example',
      JobType: 'service', TaskGroup: 'cache', NodeID: '2a0bce4e-7c1d-4f0e-9d7a-3b5f1c9e8a21', NodeName: 'worker-1',
      ClientStatus: 'running', DesiredStatus: 'run', CreateTime: 1790985600000000000, ModifyTime: 1790985600000000000,
    },
  ],
};

export const pluginStub = {
  ID: 'hostpath-plugin0', Provider: 'csi-hostpath', ControllerRequired: true,
  ControllersHealthy: 1, ControllersExpected: 1, NodesHealthy: 1, NodesExpected: 2,
};

const controllerInfo = {
  SupportsAttachDetach: false, SupportsCreateDelete: true, SupportsCreateDeleteSnapshot: true,
  SupportsExpand: true, SupportsListSnapshots: true, SupportsListVolumes: true,
};

export const pluginDetail = {
  ...pluginStub, NodesExpected: 1, Version: 'v1.9.0', Allocations: [],
  Controllers: {
    '2a0bce4e-7c1d-4f0e-9d7a-3b5f1c9e8a21': {
      PluginID: 'hostpath-plugin0', AllocID: 'f3dc8719-b4c4-eec3-872f-387ccb41a88d', Healthy: true,
      HealthDescription: 'healthy', UpdateTime: '2026-10-03T10:38:59.815844929Z', ControllerInfo: controllerInfo,
    },
  },
  Nodes: {
    '2a0bce4e-7c1d-4f0e-9d7a-3b5f1c9e8a21': {
      PluginID: 'hostpath-plugin0', AllocID: 'f3dc8719-b4c4-eec3-872f-387ccb41a88d', Healthy: true,
      HealthDescription: 'healthy', UpdateTime: '2026-10-03T10:38:59.816004512Z',
      NodeInfo: { ID: 'node-0', MaxVolumes: 9223372036854775807, AccessibleTopology: { Segments: { 'topology.hostpath.csi/node': 'node-0' } } },
    },
  },
};
