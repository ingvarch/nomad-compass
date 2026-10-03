// CSI volumes and plugins, as the Nomad API returns them. Nomad sends null for empty lists and maps.

import type { NomadAllocation } from './nomad';

export interface NomadCSITopology {
    Segments: Record<string, string>;
}

export interface NomadCSIVolumeCapability {
    AccessMode: string;         // single-node-writer, multi-node-multi-writer, ...
    AttachmentMode: string;     // file-system or block-device
}

export interface NomadCSIMountOptions {
    FSType: string;
    MountFlags: string[] | null;    // Nomad redacts the flags in its answers
}

// Volume as returned by the volumes list (GET /v1/volumes?type=csi). It has no capacity.
export interface NomadCSIVolumeListStub {
    ID: string;
    Namespace: string;
    Name: string;
    ExternalID: string;
    Topologies: (NomadCSITopology | null)[] | null;
    // Mode of the current claims; empty while no allocation claims the volume
    AccessMode: string;
    AttachmentMode: string;
    CurrentReaders: number;
    CurrentWriters: number;
    Schedulable: boolean;
    PluginID: string;
    Provider: string;
    ControllerRequired: boolean;
    ControllersHealthy: number;
    ControllersExpected: number;
    NodesHealthy: number;
    NodesExpected: number;
    ResourceExhausted: string | null;
    CreateIndex: number;
    ModifyIndex: number;
}

export interface NomadCSIVolume extends Omit<NomadCSIVolumeListStub, 'CurrentReaders' | 'CurrentWriters'> {
    Capacity: number;
    RequestedCapacityMin: number;
    RequestedCapacityMax: number;
    RequestedCapabilities: NomadCSIVolumeCapability[] | null;
    MountOptions: NomadCSIMountOptions | null;
    Secrets: Record<string, string> | null;
    Parameters: Record<string, string> | null;
    Context: Record<string, string> | null;
    ProviderVersion: string;
    CloneID: string;
    SnapshotID: string;
    // Allocation IDs as keys; the allocations themselves are in Allocations
    ReadAllocs: Record<string, unknown> | null;
    WriteAllocs: Record<string, unknown> | null;
    Allocations: NomadAllocation[] | null;
}

// Body of a volume registration: an existing volume of the storage provider
export interface NomadCSIVolumeRegistration {
    ID: string;
    Name: string;
    Namespace: string;
    PluginID: string;
    ExternalID: string;
    RequestedCapabilities: NomadCSIVolumeCapability[];
    MountOptions?: NomadCSIMountOptions;
    Parameters?: Record<string, string>;
    Context?: Record<string, string>;
    Secrets?: Record<string, string>;
}

export interface NomadCSISnapshot {
    ID: string;
    ExternalSourceVolumeID: string;
    SizeBytes: number;
    CreateTime: number;
    IsReady: boolean;
    SourceVolumeID: string;
    PluginID: string;
    Name: string;
}

export interface NomadCSIControllerInfo {
    SupportsCreateDelete: boolean;
    SupportsAttachDetach: boolean;
    SupportsListVolumes: boolean;
    SupportsCreateDeleteSnapshot: boolean;
    SupportsListSnapshots: boolean;
    SupportsExpand: boolean;
}

export interface NomadCSINodeInfo {
    ID: string;
    MaxVolumes: number;
    AccessibleTopology: NomadCSITopology | null;
}

// One running controller or node plugin, keyed by node ID in NomadCSIPlugin
export interface NomadCSIInfo {
    PluginID: string;
    AllocID: string;
    Healthy: boolean;
    HealthDescription: string;
    UpdateTime: string;
    ControllerInfo?: NomadCSIControllerInfo | null;
    NodeInfo?: NomadCSINodeInfo | null;
}

export interface NomadCSIPluginListStub {
    ID: string;
    Provider: string;
    ControllerRequired: boolean;
    ControllersHealthy: number;
    ControllersExpected: number;
    NodesHealthy: number;
    NodesExpected: number;
}

export interface NomadCSIPlugin extends NomadCSIPluginListStub {
    Version: string;
    Controllers: Record<string, NomadCSIInfo> | null;
    Nodes: Record<string, NomadCSIInfo> | null;
    Allocations: NomadAllocation[] | null;
}
