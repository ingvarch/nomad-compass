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

export interface NomadJobFormData {
    name: string;
    resources: NomadResource;
    image: string;
    plugin: string;
    namespace: string;
    envVars: NomadEnvVar[];
    ports: NomadPort[];
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
