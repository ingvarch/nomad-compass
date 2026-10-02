export type DeploymentStep =
  | 'submitting'
  | 'scheduling'
  | 'pulling'
  | 'starting'
  | 'healthy'
  | 'failed'
  | 'timeout';

export interface DeploymentState {
  step: DeploymentStep;
  jobId: string;
  namespace: string;
  evalId?: string;
  allocId?: string;
  error?: string;
  progress: number; // 0-100
}

export type NomadDeploymentStatus =
  | 'running'
  | 'successful'
  | 'failed'
  | 'paused'
  | 'cancelled';

export interface NomadDeploymentTaskGroup {
  Promoted: boolean;
  DesiredCanaries: number;
  DesiredTotal: number;
  PlacedAllocs: number;
  HealthyAllocs: number;
  UnhealthyAllocs: number;
  RequireProgressBy?: string;
  AutoRevert?: boolean;
}

export interface NomadDeployment {
  ID: string;
  JobID: string;
  JobVersion: number;
  JobModifyIndex: number;
  JobSpecModifyIndex: number;
  JobCreateIndex: number;
  Namespace?: string;
  TaskGroups: Record<string, NomadDeploymentTaskGroup>;
  Status: NomadDeploymentStatus;
  StatusDescription?: string;
  CreateIndex: number;
  ModifyIndex: number;
}

export interface NomadDeploymentPromoteRequest {
  DeploymentID: string;
  All?: boolean;
  Groups?: string[];
}

