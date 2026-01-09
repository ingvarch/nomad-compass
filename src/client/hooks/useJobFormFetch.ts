import { useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useJobFormContext, jobFormActions, defaultFormValues } from '../context/JobFormContext';
import { createNomadClient } from '../lib/api/nomad';
import { convertJobToFormData, prepareCloneFormData } from '../lib/services/jobSpecService';
import { useToast } from '../context/ToastContext';

interface UseJobFormFetchOptions {
  mode: 'create' | 'edit';
  jobId?: string;
  namespace?: string;
  cloneFromId?: string;
  cloneNamespace?: string;
}

export function useJobFormFetch({
  mode,
  jobId,
  namespace = 'default',
  cloneFromId,
  cloneNamespace = 'default',
}: UseJobFormFetchOptions) {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { dispatch } = useJobFormContext();

  const isCloneMode = mode === 'create' && !!cloneFromId;

  // Initialize form data for create mode
  useEffect(() => {
    if (mode === 'create' && !cloneFromId) {
      dispatch(jobFormActions.setFormData(defaultFormValues));
      dispatch(jobFormActions.setLoading(false));
    }
  }, [mode, cloneFromId, dispatch]);

  // Fetch namespaces
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(jobFormActions.setLoadingNamespaces(false));
      return;
    }

    const client = createNomadClient();
    client
      .getNamespaces()
      .then((response) => {
        if (response && Array.isArray(response)) {
          const nsNames = response.map((ns) => ns.Name);
          dispatch(jobFormActions.setNamespaces(nsNames.length > 0 ? nsNames : ['default']));
        }
      })
      .catch(() => dispatch(jobFormActions.setNamespaces(['default'])))
      .finally(() => dispatch(jobFormActions.setLoadingNamespaces(false)));
  }, [isAuthenticated, dispatch]);

  // Fetch job data for edit mode
  const fetchJobData = useCallback(async () => {
    if (mode !== 'edit' || !isAuthenticated || !jobId) {
      dispatch(jobFormActions.setLoading(false));
      return;
    }

    dispatch(jobFormActions.setLoading(true));
    try {
      const client = createNomadClient();
      const jobData = await client.getJob(jobId, namespace);
      dispatch(jobFormActions.setInitialJob(jobData));

      const formattedData = convertJobToFormData(jobData);
      formattedData.taskGroups = formattedData.taskGroups.map((group) => ({
        ...group,
        envVars: group.envVars || [],
      }));

      dispatch(jobFormActions.setFormData(formattedData));
      dispatch(jobFormActions.setError(null));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load job details';
      dispatch(jobFormActions.setError(message));
      addToast(message, 'error');
    } finally {
      dispatch(jobFormActions.setLoading(false));
    }
  }, [mode, isAuthenticated, jobId, namespace, dispatch, addToast]);

  useEffect(() => {
    if (mode === 'edit') {
      fetchJobData();
    }
  }, [mode, fetchJobData]);

  // Fetch source job for cloning
  const fetchCloneSourceJob = useCallback(async () => {
    if (!isCloneMode || !isAuthenticated || !cloneFromId) {
      dispatch(jobFormActions.setLoading(false));
      return;
    }

    dispatch(jobFormActions.setLoading(true));
    try {
      const client = createNomadClient();
      const jobData = await client.getJob(cloneFromId, cloneNamespace);

      const formattedData = convertJobToFormData(jobData);
      formattedData.taskGroups = formattedData.taskGroups.map((group) => ({
        ...group,
        envVars: group.envVars || [],
      }));

      const cloneData = prepareCloneFormData(formattedData);
      dispatch(jobFormActions.setFormData(cloneData));
      dispatch(jobFormActions.setError(null));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load source job for cloning';
      dispatch(jobFormActions.setError(message));
      addToast(message, 'error');
    } finally {
      dispatch(jobFormActions.setLoading(false));
    }
  }, [isCloneMode, isAuthenticated, cloneFromId, cloneNamespace, dispatch, addToast]);

  useEffect(() => {
    if (isCloneMode) {
      fetchCloneSourceJob();
    }
  }, [isCloneMode, fetchCloneSourceJob]);

  return { fetchJobData, fetchCloneSourceJob };
}
