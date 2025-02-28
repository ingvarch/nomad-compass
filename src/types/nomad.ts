// Nomad API types

export interface NomadJob {
    ID: string;
    Name: string;
    Type: string;
    Status: string;
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
    Jobs: NomadJob[];
  }
  
  export interface ApiError {
    statusCode: number;
    message: string;
  }
  