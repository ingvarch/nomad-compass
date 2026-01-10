// src/types/nomad.ts
// Nomad API types

// Constraint types for job/task group/task level constraints
export interface NomadConstraint {
    LTarget?: string;  // Left operand (e.g., "${attr.kernel.name}")
    RTarget?: string;  // Right operand (e.g., "linux")
    Operand?: string;  // Operator (e.g., "=", "!=", "regexp", "set_contains")
}

// Service check configuration (health checks)
export interface NomadServiceCheck {
    Type: 'http' | 'tcp' | 'script' | 'grpc';
    Path?: string;              // For HTTP checks
    Command?: string;           // For script checks
    Args?: string[];            // For script checks
    Protocol?: string;          // For HTTP checks
    PortLabel?: string;
    Interval: number;           // Nanoseconds
    Timeout: number;            // Nanoseconds
    InitialStatus?: 'passing' | 'warning' | 'critical';
    Header?: Record<string, string[]>;
    Method?: string;            // HTTP method
    Body?: string;              // HTTP body
    TLSSkipVerify?: boolean;
    GRPCService?: string;
    GRPCUseTLS?: boolean;
    CheckRestart?: {
        Limit: number;
        Grace: number;          // Nanoseconds
        IgnoreWarnings: boolean;
    };
    OnUpdate?: 'require_healthy' | 'ignore_warnings' | 'ignore';
}

// Service definition for task groups
export interface NomadServiceDefinition {
    Name: string;
    TaskName?: string;
    PortLabel?: string;
    AddressMode?: 'alloc' | 'auto' | 'host' | 'driver';
    Provider?: 'nomad' | 'consul';
    Tags?: string[];
    CanaryTags?: string[];
    Checks?: NomadServiceCheck[];
    Connect?: {
        SidecarService?: Record<string, unknown>;
        SidecarTask?: Record<string, unknown>;
    };
    Meta?: Record<string, string>;
}

// Template configuration for tasks
export interface NomadTemplate {
    SourcePath?: string;
    DestPath: string;
    EmbeddedTmpl?: string;
    ChangeMode?: 'noop' | 'restart' | 'signal' | 'script';
    ChangeSignal?: string;
    ChangeScript?: {
        Command: string;
        Args?: string[];
    };
    Splay?: number;
    Perms?: string;
    Uid?: number;
    Gid?: number;
    LeftDelim?: string;
    RightDelim?: string;
    Envvars?: boolean;
    VaultGrace?: number;
    ErrMissingKey?: boolean;
}

// Task config for Docker/Podman drivers
export interface NomadTaskDriverConfig {
    image?: string;
    command?: string;
    args?: string[];
    ports?: string[];
    volumes?: string[];
    auth?: {
        username: string;
        password: string;
    };
    logging?: {
        type: string;
        config?: Record<string, string>;
    };
    [key: string]: unknown;  // Allow additional driver-specific options
}

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
    Constraints?: NomadConstraint[];
    Priority?: number;
}

export interface NomadTaskGroup {
    Name: string;
    Count: number;
    Tasks: NomadTask[];
    Networks?: NomadNetwork[];
    Services?: NomadServiceDefinition[];
    Meta?: Record<string, string>;
    Constraints?: NomadConstraint[];
}

export interface NomadTask {
    Name: string;
    Driver: string;
    Config: NomadTaskDriverConfig;
    Resources: NomadResource;
    Env?: Record<string, string>;
    Meta?: Record<string, string>;
    Constraints?: NomadConstraint[];
    Templates?: NomadTemplate[];
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

// Service Discovery & Ingress types
export interface NomadServiceTag {
    key: string;
    value: string;
}

export interface IngressConfig {
    enabled: boolean;
    domain: string;
    enableHttps: boolean;
    pathPrefix?: string;
}

export interface NomadServiceConfig {
    name: string;
    portLabel: string;
    provider: 'nomad' | 'consul';
    addressMode: 'alloc' | 'auto' | 'host';
    tags: NomadServiceTag[];
    ingress: IngressConfig;
    useAdvancedMode: boolean;
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
    // Service Discovery & Ingress
    enableService: boolean;
    serviceConfig?: NomadServiceConfig;
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

// Service Registration types (from Nomad service discovery)
export interface NomadServiceRegistration {
    Address: string;
    AllocID: string;
    CreateIndex: number;
    Datacenter: string;
    ID: string;
    JobID: string;
    ModifyIndex: number;
    Namespace: string;
    NodeID: string;
    Port: number;
    ServiceName: string;
    Tags?: string[];
}
