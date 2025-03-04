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
    CreateTime: number;
    ModifyTime: number;
    TaskGroups?: NomadTaskGroup[];
    Datacenters?: string[];
    Meta?: Record<string, string>;
    Constraints?: any[];
    Priority?: number;
    Version?: number;
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
    DynamicPorts?: { Label: string, To?: number }[];
    ReservedPorts?: { Label: string, Value: number, To?: number }[];
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
    DiskMB?: number;
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
    taskName?: string;
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

export interface NomadTaskConfig {
    image: string;
    plugin?: string;
    env?: Record<string, string>;
}

export interface DockerAuth {
    username: string;
    password: string;
}

// New interface for task-specific form data
export interface TaskFormData {
    name: string;
    image: string;
    plugin: string;
    resources: NomadResource;
    envVars: NomadEnvVar[];
    usePrivateRegistry: boolean;
    dockerAuth?: DockerAuth;
}

export interface NomadJobFormData {
    name: string;
    namespace: string;
    // Tasks array to hold multiple containers
    tasks: TaskFormData[];
    ports: NomadPort[];
    enablePorts: boolean;
    networkMode: 'none' | 'host' | 'bridge';
    serviceProvider: 'nomad' | 'consul';
    healthChecks: NomadHealthCheck[];
    enableHealthCheck: boolean;
    count: number;
    datacenters: string[];
}

export interface NomadNamespace {
    Name: string;
    Description?: string;
    CreateIndex?: number;
    ModifyIndex?: number;
}
