import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useJobFormContext, jobFormActions } from '../context/JobFormContext';
import { createNomadClient } from '../lib/api/nomad';
import { isPermissionError, getPermissionErrorMessage, getErrorMessage } from '../lib/errors';
import { createJobSpec, updateJobSpec } from '../lib/services/jobSpecService';
import { validateJobForm } from '../lib/services/jobFormValidation';
import { useToast } from '../context/ToastContext';
import { useDeploymentTracker } from './useDeploymentTracker';
import { NomadJobFormData, TaskGroupFormData, TaskFormData, NomadEnvVar } from '../types/nomad';

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
      tasks: group.tasks.map((task: TaskFormData) => ({
        ...task,
        envVars: (task.envVars || []).filter(
          (ev: NomadEnvVar) => ev.key.trim() !== '' || ev.value.trim() !== ''
        ),
      })),
    })),
  };
}

interface ValidationResult {
  isValid: boolean;
  formData: NomadJobFormData | null;
}

export function useJobPlan({ mode, jobId }: UseJobPlanOptions) {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { state, dispatch } = useJobFormContext();
  const { formData, initialJob } = state;
  const deploymentTracker = useDeploymentTracker();

  // Shared validation logic
  const validateAndCheckAuth = useCallback((): ValidationResult => {
    const validationError = validateJobForm(formData, mode);
    if (validationError) {
      dispatch(jobFormActions.setError(validationError));
      if (mode === 'create' && validationError.includes('Job name')) {
        dispatch(jobFormActions.setNameValid(false));
      }
      return { isValid: false, formData: null };
    }

    if (!isAuthenticated || !formData) {
      dispatch(jobFormActions.setError('Authentication required'));
      return { isValid: false, formData: null };
    }

    return { isValid: true, formData };
  }, [formData, mode, isAuthenticated, dispatch]);

  // Plan (dry-run)
  const handlePlan = useCallback(async () => {
    dispatch(jobFormActions.setPlanError(null));
    dispatch(jobFormActions.setPlanResult(null));

    const { isValid, formData: validFormData } = validateAndCheckAuth();
    if (!isValid || !validFormData) return;

    dispatch(jobFormActions.setPlanning(true));
    dispatch(jobFormActions.setShowPlanPreview(true));

    try {
      const cleanedData = cleanFormData(validFormData);
      const client = createNomadClient();

      let jobSpec;
      if (mode === 'create') {
        jobSpec = createJobSpec(cleanedData);
      } else {
        if (!initialJob) throw new Error('Original job data missing');
        jobSpec = updateJobSpec(initialJob, cleanedData);
      }

      const targetJobId = mode === 'create' ? validFormData.name : jobId!;
      const result = await client.planJob(targetJobId, jobSpec, validFormData.namespace);
      dispatch(jobFormActions.setPlanResult(result));
    } catch (err) {
      dispatch(jobFormActions.setPlanError(getErrorMessage(err, 'Failed to plan job')));
    } finally {
      dispatch(jobFormActions.setPlanning(false));
    }
  }, [validateAndCheckAuth, mode, initialJob, jobId, dispatch]);

  // Submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      dispatch(jobFormActions.setError(null));
      dispatch(jobFormActions.setSuccess(null));

      const { isValid, formData: validFormData } = validateAndCheckAuth();
      if (!isValid || !validFormData) return;

      dispatch(jobFormActions.setSaving(true));
      try {
        const cleanedData = cleanFormData(validFormData);
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
        const targetJobId = mode === 'create' ? validFormData.name : jobId!;
        const targetNamespace = validFormData.namespace;

        if (evalId) {
          deploymentTracker.startTracking(targetJobId, targetNamespace, evalId);
        } else {
          dispatch(
            jobFormActions.setSuccess(
              `Job "${validFormData.name}" ${mode === 'create' ? 'created' : 'updated'} successfully!`
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
          const message = getErrorMessage(err, `Failed to ${mode} job`);
          dispatch(jobFormActions.setError(message));
          addToast(message, 'error');
        }
      } finally {
        dispatch(jobFormActions.setSaving(false));
      }
    },
    [validateAndCheckAuth, mode, initialJob, jobId, dispatch, addToast, deploymentTracker]
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
