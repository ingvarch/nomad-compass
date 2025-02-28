// Nomad API types

export interface NomadJob {
    ID: string;
    Name: string;
    Type: string;
    Status: string;
    Stop: boolean;
    StatusDescription?: string;
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
    envVars: NomadEnvVar[];
}
