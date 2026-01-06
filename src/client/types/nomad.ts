// src/types/nomad.ts
// Nomad API types

export interface NomadJob {
    ID: string;
    Name: string;
    Type: string;
    Status: string;
    Stop: boolean;
    StatusDescription?: string;
    Namespace: string;
    JobSummary?: {
        JobID: string;
        Summary: Record<string, {
            Running: number;
            Starting: number;
            Failed: number;
            Complete: number;
            Lost: number;
            Unknown: number;
        }>;
    };
    SubmitTime: number;
    Version: number;
    TaskGroups?: NomadTaskGroup[];
    Datacenters?: string[];
    Meta?: Record<string, string>;
    Constraints?: any[];
    Priority?: number;
}

export interface NomadTaskGroup {
    Name: string;
    Count: number;
    Tasks: NomadTask[];
    Networks?: NomadNetwork[];
    Services?: any[];
    Meta?: Record<string, string>;
    Constraints?: any[];
}

export interface NomadTask {
    Name: string;
    Driver: string;
    Config: any;
    Resources: NomadResource;
    Env?: Record<string, string>;
    Meta?: Record<string, string>;
    Constraints?: any[];
    Templates?: any[];
    Leader?: boolean;
    KillTimeout?: number;
    ShutdownDelay?: number;
}

export interface NomadNetwork {
    Mode: string;
    DynamicPorts?: { Label: string, To?: number, TaskName?: string }[];
    ReservedPorts?: { Label: string, Value: number, To?: number, TaskName?: string }[];
}

export interface NomadJobsResponse {
    Jobs?: NomadJob[];
}

export interface ApiError {
    statusCode: number;
    message: string;
}

export interface NomadResource {
    CPU: number;
    MemoryMB: number;
    DiskMB: number;
}

export interface NomadEnvVar {
    key: string;
    value: string;
}

export interface NomadPort {
    label: string;
    value: number;
    to?: number;
    static?: boolean;
}

export interface NomadHealthCheck {
    type: 'http' | 'tcp' | 'script';
    path?: string;
    command?: string;
    interval: number;
    timeout: number;
    initialDelay?: number;
    failuresBeforeUnhealthy: number;
    successesBeforeHealthy: number;
}

export interface DockerAuth {
    username: string;
    password: string;
}

export interface TaskGroupFormData {
    name: string;
    count: number;
    image: string;
    plugin: string;
    resources: NomadResource;
    envVars: NomadEnvVar[];
    usePrivateRegistry: boolean;
    dockerAuth?: DockerAuth;
    enableNetwork: boolean;
    networkMode: 'none' | 'host' | 'bridge';
    ports: NomadPort[];
    enableHealthCheck: boolean;
    healthCheck?: NomadHealthCheck;
}

export interface NomadJobFormData {
    name: string;
    namespace: string;
    taskGroups: TaskGroupFormData[];
    serviceProvider: 'nomad';
    datacenters: string[];
}

export interface NomadNamespaceCapabilities {
    EnabledTaskDrivers?: string[];
    DisabledTaskDrivers?: string[];
}

export interface NomadNamespace {
    Name: string;
    Description?: string;
    Meta?: Record<string, string>;
    Capabilities?: NomadNamespaceCapabilities;
    CreateIndex?: number;
    ModifyIndex?: number;
}

// Node types for cluster monitoring
export interface NomadNode {
    ID: string;
    Name: string;
    Status: 'ready' | 'down' | 'initializing';
    StatusDescription?: string;
    SchedulingEligibility: 'eligible' | 'ineligible';
    Drain: boolean;
    Datacenter?: string;
    NodeClass?: string;
    Version?: string;
    NodeResources?: {
        Cpu: { CpuShares: number };
        Memory: { MemoryMB: number };
        Disk: { DiskMB: number };
    };
    ReservedResources?: {
        Cpu: { CpuShares: number };
        Memory: { MemoryMB: number };
        Disk: { DiskMB: number };
    };
    Attributes?: Record<string, string>;
}

// Extended node detail type for individual node view
export interface NomadNodeDetail extends NomadNode {
    HTTPAddr?: string;
    TLSEnabled?: boolean;
    Drivers?: Record<string, NomadDriverInfo>;
    HostVolumes?: Record<string, NomadHostVolumeInfo>;
    Events?: NomadNodeEvent[];
    CreateIndex?: number;
    ModifyIndex?: number;
}

export interface NomadDriverInfo {
    Detected: boolean;
    Healthy: boolean;
    HealthDescription?: string;
    UpdateTime?: string;
    Attributes?: Record<string, string>;
}

export interface NomadHostVolumeInfo {
    Path: string;
    ReadOnly: boolean;
}

export interface NomadNodeEvent {
    Message: string;
    Subsystem: string;
    Details?: Record<string, string>;
    Timestamp: string;
    CreateIndex?: number;
}

// Agent types for cluster health
export interface NomadVersionInfo {
    Version: string;
    Revision: string;
    BuildDate: string;
    VersionMetadata?: string;
    VersionPrerelease?: string;
}

export interface NomadAgentSelf {
    config: {
        Region: string;
        Datacenter: string;
        Version: NomadVersionInfo;
    };
    member: {
        Name: string;
        Addr: string;
        Port: number;
        Status: string;
    };
    stats?: Record<string, Record<string, string>>;
}

export interface NomadAgentMember {
    Name: string;
    Addr: string;
    Port: number;
    Status: string;
    Leader: boolean;
    ProtocolMin: number;
    ProtocolMax: number;
    ProtocolCur: number;
    DelegateMin: number;
    DelegateMax: number;
    DelegateCur: number;
}

export interface NomadAgentMembers {
    ServerName: string;
    ServerRegion: string;
    ServerDC: string;
    Members: NomadAgentMember[];
}

// Allocation types for allocation management
export interface NomadAllocationTaskState {
    State: 'pending' | 'running' | 'dead';
    Failed: boolean;
    Restarts: number;
    LastRestart?: string;
    StartedAt?: string;
    FinishedAt?: string;
    Events?: NomadTaskEvent[];
}

export interface NomadTaskEvent {
    Type: string;
    Time: number;
    Message: string;
    DisplayMessage?: string;
    Details?: Record<string, string>;
    FailsTask?: boolean;
    RestartReason?: string;
    SetupError?: string;
    DriverError?: string;
    ExitCode?: number;
    Signal?: number;
    KillReason?: string;
    KillTimeout?: number;
    KillError?: string;
    DownloadError?: string;
    ValidationError?: string;
    DiskLimit?: number;
    DiskSize?: number;
    FailedSibling?: string;
    VaultError?: string;
    TaskSignalReason?: string;
    TaskSignal?: string;
    DriverMessage?: string;
}

export interface NomadAllocation {
    ID: string;
    EvalID: string;
    Name: string;
    Namespace: string;
    NodeID: string;
    NodeName: string;
    JobID: string;
    JobType: string;
    JobVersion: number;
    TaskGroup: string;
    ClientStatus: 'pending' | 'running' | 'complete' | 'failed' | 'lost' | 'unknown';
    ClientDescription?: string;
    DesiredStatus: 'run' | 'stop' | 'evict';
    DesiredDescription?: string;
    TaskStates?: Record<string, NomadAllocationTaskState>;
    AllocatedResources?: {
        Tasks: Record<string, {
            Cpu: { CpuShares: number };
            Memory: { MemoryMB: number };
        }>;
        Shared?: {
            DiskMB: number;
        };
    };
    DeploymentStatus?: {
        Healthy: boolean;
        Canary: boolean;
        Timestamp: string;
    };
    CreateTime: number;
    ModifyTime: number;
    CreateIndex: number;
    ModifyIndex: number;
}

// Evaluation types
export interface NomadEvaluation {
    ID: string;
    Namespace: string;
    Priority: number;
    Type: string;
    TriggeredBy: string;
    JobID: string;
    JobModifyIndex: number;
    NodeID?: string;
    NodeModifyIndex?: number;
    Status: 'pending' | 'blocked' | 'complete' | 'failed' | 'canceled';
    StatusDescription?: string;
    Wait: number;
    WaitUntil?: string;
    NextEval?: string;
    PreviousEval?: string;
    BlockedEval?: string;
    FailedTGAllocs?: Record<string, NomadFailedTGAlloc>;
    ClassEligibility?: Record<string, boolean>;
    QuotaLimitReached?: string;
    EscapedComputedClass: boolean;
    AnnotatePlan: boolean;
    QueuedAllocations?: Record<string, number>;
    SnapshotIndex: number;
    CreateIndex: number;
    ModifyIndex: number;
    CreateTime: number;
    ModifyTime: number;
}

export interface NomadFailedTGAlloc {
    CoalescedFailures: number;
    NodesEvaluated: number;
    NodesFiltered: number;
    NodesAvailable?: Record<string, number>;
    ClassFiltered?: Record<string, number>;
    ConstraintFiltered?: Record<string, number>;
    NodesExhausted: number;
    ClassExhausted?: Record<string, number>;
    DimensionExhausted?: Record<string, number>;
    QuotaExhausted?: string[];
    Scores?: Record<string, number>;
    AllocationTime?: number;
}

// Job Plan (dry-run) response types
export interface NomadJobPlanAnnotations {
    DesiredTGUpdates?: Record<string, NomadDesiredUpdates>;
    PreemptedAllocs?: NomadAllocation[];
}

export interface NomadDesiredUpdates {
    Ignore?: number;
    Place?: number;
    Migrate?: number;
    Stop?: number;
    InPlaceUpdate?: number;
    DestructiveUpdate?: number;
    Canary?: number;
    Preemptions?: number;
}

export interface NomadJobDiff {
    Type: 'Added' | 'Deleted' | 'Edited' | 'None';
    ID: string;
    Fields?: NomadFieldDiff[];
    Objects?: NomadObjectDiff[];
    TaskGroups?: NomadTaskGroupDiff[];
}

export interface NomadFieldDiff {
    Type: 'Added' | 'Deleted' | 'Edited' | 'None';
    Name: string;
    Old: string;
    New: string;
    Annotations?: string[];
}

export interface NomadObjectDiff {
    Type: 'Added' | 'Deleted' | 'Edited' | 'None';
    Name: string;
    Fields?: NomadFieldDiff[];
    Objects?: NomadObjectDiff[];
}

export interface NomadTaskGroupDiff {
    Type: 'Added' | 'Deleted' | 'Edited' | 'None';
    Name: string;
    Fields?: NomadFieldDiff[];
    Objects?: NomadObjectDiff[];
    Tasks?: NomadTaskDiff[];
    Updates?: Record<string, number>;
}

export interface NomadTaskDiff {
    Type: 'Added' | 'Deleted' | 'Edited' | 'None';
    Name: string;
    Fields?: NomadFieldDiff[];
    Objects?: NomadObjectDiff[];
    Annotations?: string[];
}

export interface NomadJobPlanResponse {
    Index: number;
    Diff?: NomadJobDiff;
    Annotations?: NomadJobPlanAnnotations;
    FailedTGAllocs?: Record<string, NomadFailedTGAlloc>;
    Warnings?: string;
    NextPeriodicLaunch?: string;
    CreatedEvals?: NomadEvaluation[];
}
