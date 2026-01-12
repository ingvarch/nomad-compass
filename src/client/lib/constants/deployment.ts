import type { DeploymentStep } from '../../types/deployment';

export const DEPLOYMENT_STEPS: DeploymentStep[] = [
  'submitting',
  'scheduling',
  'pulling',
  'starting',
  'healthy',
];

export const STEP_LABELS: Record<DeploymentStep, string> = {
  submitting: 'Submitting',
  scheduling: 'Scheduling',
  pulling: 'Pulling image',
  starting: 'Starting',
  healthy: 'Healthy',
  failed: 'Failed',
  timeout: 'Timeout',
};

export const STEP_PROGRESS: Record<DeploymentStep, number> = {
  submitting: 20,
  scheduling: 40,
  pulling: 60,
  starting: 80,
  healthy: 100,
  failed: 0,
  timeout: 0,
};
