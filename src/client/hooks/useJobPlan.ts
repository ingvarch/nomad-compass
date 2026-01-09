import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useJobFormContext, jobFormActions } from '../context/JobFormContext';
import { createNomadClient } from '../lib/api/nomad';
import { isPermissionError, getPermissionErrorMessage } from '../lib/api/errors';
import { createJobSpec, updateJobSpec } from '../lib/services/jobSpecService';
import { validateJobName } from '../lib/services/validationService';
import { useToast } from '../context/ToastContext';
import { useDeploymentTracker } from './useDeploymentTracker';
import { NomadJobFormData, TaskGroupFormData, NomadEnvVar } from '../types/nomad';

interface UseJobPlanOptions {
  mode: 'create' | 'edit';
  jobId?: string;
}

// Clean empty env vars before submit
function cleanFormData(data: NomadJobFormData): NomadJobFormData {
  return {
    ...data,
    taskGroups: data.taskGroups.map((group: TaskGroupFormData) => ({
      ...group,
      envVars: (group.envVars || []).filter(
        (ev: NomadEnvVar) => ev.key.trim() !== '' || ev.value.trim() !== ''
      ),
    })),
  };
}

// Form validation
function validateForm(formData: NomadJobFormData | null, mode: 'create' | 'edit'): string | null {
  if (!formData) return 'Form data is missing';

  if (mode === 'create') {
    if (!formData.name.trim()) return 'Job name is required';
    if (!validateJobName(formData.name)) {
      return 'Job name must start with a letter or number and contain only letters, numbers, hyphens, underscores, and dots';
    }
  }

  for (let i = 0; i < formData.taskGroups.length; i++) {
    const group = formData.taskGroups[i];
    if (!group.name.trim()) return `Group ${i + 1} name is required`;
    if (!group.image.trim()) return `Image for group ${i + 1} is required`;

    if (group.usePrivateRegistry) {
      if (!group.dockerAuth?.username)
        return `Username is required for private registry in group ${i + 1}`;
      if (!group.dockerAuth?.password)
        return `Password is required for private registry in group ${i + 1}`;
    }

    if (group.enableNetwork && group.ports.length > 0) {
      for (let j = 0; j < group.ports.length; j++) {
        const port = group.ports[j];
        if (!port.label) return `Port label is required for port ${j + 1} in group ${i + 1}`;
        if (port.static && (!port.value || port.value <= 0 || port.value > 65535)) {
          return `Valid port value (1-65535) is required for static port ${j + 1} in group ${i + 1}`;
        }
      }
    }
  }
  return null;
}

export function useJobPlan({ mode, jobId }: UseJobPlanOptions) {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { state, dispatch } = useJobFormContext();
  const { formData, initialJob } = state;
  const deploymentTracker = useDeploymentTracker();

  // Plan (dry-run)
  const handlePlan = useCallback(async () => {
    dispatch(jobFormActions.setPlanError(null));
    dispatch(jobFormActions.setPlanResult(null));

    const validationError = validateForm(formData, mode);
    if (validationError) {
      dispatch(jobFormActions.setError(validationError));
      if (mode === 'create' && validationError.includes('Job name')) {
        dispatch(jobFormActions.setNameValid(false));
      }
      return;
    }

    if (!isAuthenticated || !formData) {
      dispatch(jobFormActions.setError('Authentication required'));
      return;
    }

    dispatch(jobFormActions.setPlanning(true));
    dispatch(jobFormActions.setShowPlanPreview(true));

    try {
      const cleanedData = cleanFormData(formData);
      const client = createNomadClient();

      let jobSpec;
      if (mode === 'create') {
        jobSpec = createJobSpec(cleanedData);
      } else {
        if (!initialJob) throw new Error('Original job data missing');
        jobSpec = updateJobSpec(initialJob, cleanedData);
      }

      const targetJobId = mode === 'create' ? formData.name : jobId!;
      const result = await client.planJob(targetJobId, jobSpec, formData.namespace);
      dispatch(jobFormActions.setPlanResult(result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to plan job';
      dispatch(jobFormActions.setPlanError(message));
    } finally {
      dispatch(jobFormActions.setPlanning(false));
    }
  }, [formData, mode, initialJob, jobId, isAuthenticated, dispatch]);

  // Submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      dispatch(jobFormActions.setError(null));
      dispatch(jobFormActions.setSuccess(null));

      const validationError = validateForm(formData, mode);
      if (validationError) {
        dispatch(jobFormActions.setError(validationError));
        if (mode === 'create' && validationError.includes('Job name')) {
          dispatch(jobFormActions.setNameValid(false));
        }
        return;
      }

      if (!isAuthenticated || !formData) {
        dispatch(jobFormActions.setError('Authentication required'));
        return;
      }

      dispatch(jobFormActions.setSaving(true));
      try {
        const cleanedData = cleanFormData(formData);
        const client = createNomadClient();

        let response;
        if (mode === 'create') {
          const jobSpec = createJobSpec(cleanedData);
          response = await client.createJob(jobSpec);
        } else {
          if (!initialJob) throw new Error('Original job data missing');
          const jobSpec = updateJobSpec(initialJob, cleanedData);
          response = await client.updateJob(jobSpec);
        }

        const evalId = response.EvalID;
        const targetJobId = mode === 'create' ? formData.name : jobId!;
        const targetNamespace = formData.namespace;

        if (evalId) {
          deploymentTracker.startTracking(targetJobId, targetNamespace, evalId);
        } else {
          dispatch(
            jobFormActions.setSuccess(
              `Job "${formData.name}" ${mode === 'create' ? 'created' : 'updated'} successfully!`
            )
          );
        }
      } catch (err) {
        if (isPermissionError(err)) {
          dispatch(
            jobFormActions.setPermissionError(
              getPermissionErrorMessage(mode === 'create' ? 'create-job' : 'update-job')
            )
          );
        } else {
          const message = err instanceof Error ? err.message : `Failed to ${mode} job`;
          dispatch(jobFormActions.setError(message));
          addToast(message, 'error');
        }
      } finally {
        dispatch(jobFormActions.setSaving(false));
      }
    },
    [formData, mode, initialJob, jobId, isAuthenticated, dispatch, addToast, deploymentTracker]
  );

  // Submit from plan preview
  const handleSubmitFromPlan = useCallback(async () => {
    dispatch(jobFormActions.setShowPlanPreview(false));
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSubmit(fakeEvent);
  }, [handleSubmit, dispatch]);

  const closePlanPreview = useCallback(() => {
    dispatch(jobFormActions.resetPlan());
  }, [dispatch]);

  return {
    handlePlan,
    handleSubmit,
    handleSubmitFromPlan,
    closePlanPreview,
    deploymentTracker,
  };
}
