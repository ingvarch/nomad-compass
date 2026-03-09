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

