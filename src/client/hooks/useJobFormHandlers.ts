import { useCallback } from 'react';
import { useJobFormContext, jobFormActions, defaultTaskGroupData } from '../context/JobFormContext';
import { validateJobName } from '../lib/services/validationService';
import {
  NomadPort,
  NomadHealthCheck,
  NomadServiceConfig,
  IngressConfig,
} from '../types/nomad';

interface UseJobFormHandlersOptions {
  mode: 'create' | 'edit';
}

export function useJobFormHandlers({ mode }: UseJobFormHandlersOptions) {
  const { state, dispatch } = useJobFormContext();
  const { formData } = state;

  // Job-level input changes
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      if (!formData) return;
      const { name, value, type } = e.target;

      if (name === 'name' && mode === 'create') {
        dispatch(jobFormActions.setNameValid(validateJobName(value)));
      }

      if (name === 'datacenters') {
        dispatch(jobFormActions.updateField('datacenters', value.split(',').map((dc) => dc.trim())));
      } else {
        dispatch(jobFormActions.updateField(name as keyof typeof formData, type === 'number' ? Number(value) : value));
      }
    },
    [formData, mode, dispatch]
  );

  // Task group input changes
  const handleGroupInputChange = useCallback(
    (groupIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (!formData) return;
      const { name, value, type } = e.target;
      const parts = name.split('.');
      const group = formData.taskGroups[groupIndex];

      if (parts.length === 1) {
        dispatch(jobFormActions.updateTaskGroup(groupIndex, { [name]: type === 'number' ? Number(value) : value }));
      } else if (parts[0] === 'resources') {
        dispatch(jobFormActions.updateTaskGroup(groupIndex, {
          resources: { ...group.resources, [parts[1]]: parseInt(value, 10) },
        }));
      } else if (parts[0] === 'dockerAuth') {
        dispatch(jobFormActions.updateTaskGroup(groupIndex, {
          dockerAuth: { ...group.dockerAuth!, [parts[1]]: value },
        }));
      } else if (parts[0] === 'healthCheck') {
        dispatch(jobFormActions.updateTaskGroup(groupIndex, {
          healthCheck: {
            ...group.healthCheck!,
            [parts[1]]: type === 'number' ? parseInt(value, 10) : value,
          },
        }));
      }
    },
    [formData, dispatch]
  );

  const handleSelectChange = useCallback(
    (groupIndex: number, e: React.ChangeEvent<HTMLSelectElement>) => {
      dispatch(jobFormActions.updateTaskGroup(groupIndex, { [e.target.name]: e.target.value }));
    },
    [dispatch]
  );

  const handleGroupCheckboxChange = useCallback(
    (groupIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(jobFormActions.updateTaskGroup(groupIndex, { [e.target.name]: e.target.checked }));
    },
    [dispatch]
  );

  // Task group management
  const addTaskGroup = useCallback(() => {
    if (!formData) return;
    const newGroup = {
      ...defaultTaskGroupData,
      name: `${formData.name ? formData.name + '-' : ''}group-${formData.taskGroups.length + 1}`,
    };
    dispatch(jobFormActions.addTaskGroup(newGroup));
  }, [formData, dispatch]);

  const removeTaskGroup = useCallback(
    (groupIndex: number) => {
      dispatch(jobFormActions.removeTaskGroup(groupIndex));
    },
    [dispatch]
  );

  // Environment variables
  const handleEnvVarChange = useCallback(
    (groupIndex: number, varIndex: number, field: 'key' | 'value', value: string) => {
      dispatch(jobFormActions.updateEnvVar(groupIndex, varIndex, field, value));
    },
    [dispatch]
  );

  const addEnvVar = useCallback(
    (groupIndex: number) => {
      dispatch(jobFormActions.addEnvVar(groupIndex));
    },
    [dispatch]
  );

  const removeEnvVar = useCallback(
    (groupIndex: number, varIndex: number) => {
      dispatch(jobFormActions.removeEnvVar(groupIndex, varIndex));
    },
    [dispatch]
  );

  // Ports
  const handlePortChange = useCallback(
    (groupIndex: number, portIndex: number, field: keyof NomadPort, value: string) => {
      dispatch(jobFormActions.updatePort(groupIndex, portIndex, field, value));
    },
    [dispatch]
  );

  const addPort = useCallback(
    (groupIndex: number) => {
      dispatch(jobFormActions.addPort(groupIndex));
    },
    [dispatch]
  );

  const removePort = useCallback(
    (groupIndex: number, portIndex: number) => {
      dispatch(jobFormActions.removePort(groupIndex, portIndex));
    },
    [dispatch]
  );

  // Health check
  const handleHealthCheckChange = useCallback(
    (groupIndex: number, field: keyof NomadHealthCheck, value: string | number) => {
      dispatch(jobFormActions.updateHealthCheck(groupIndex, field, value));
    },
    [dispatch]
  );

  // Network
  const handleEnableNetworkChange = useCallback(
    (groupIndex: number, enabled: boolean) => {
      dispatch(jobFormActions.enableNetwork(groupIndex, enabled));
    },
    [dispatch]
  );

  // Service
  const handleEnableServiceChange = useCallback(
    (groupIndex: number, enabled: boolean) => {
      dispatch(jobFormActions.enableService(groupIndex, enabled));
    },
    [dispatch]
  );

  const handleServiceConfigChange = useCallback(
    (groupIndex: number, config: Partial<NomadServiceConfig>) => {
      dispatch(jobFormActions.updateServiceConfig(groupIndex, config));
    },
    [dispatch]
  );

  const handleIngressChange = useCallback(
    (groupIndex: number, field: keyof IngressConfig, value: string | boolean) => {
      dispatch(jobFormActions.updateIngress(groupIndex, field, value));
    },
    [dispatch]
  );

  // Service tags
  const handleServiceTagChange = useCallback(
    (groupIndex: number, tagIndex: number, field: 'key' | 'value', value: string) => {
      dispatch(jobFormActions.updateServiceTag(groupIndex, tagIndex, field, value));
    },
    [dispatch]
  );

  const addServiceTag = useCallback(
    (groupIndex: number) => {
      dispatch(jobFormActions.addServiceTag(groupIndex));
    },
    [dispatch]
  );

  const removeServiceTag = useCallback(
    (groupIndex: number, tagIndex: number) => {
      dispatch(jobFormActions.removeServiceTag(groupIndex, tagIndex));
    },
    [dispatch]
  );

  // Permission error
  const clearPermissionError = useCallback(() => {
    dispatch(jobFormActions.setPermissionError(null));
  }, [dispatch]);

  return {
    handleInputChange,
    handleGroupInputChange,
    handleSelectChange,
    handleGroupCheckboxChange,
    addTaskGroup,
    removeTaskGroup,
    handleEnvVarChange,
    addEnvVar,
    removeEnvVar,
    handlePortChange,
    addPort,
    removePort,
    handleHealthCheckChange,
    handleEnableNetworkChange,
    handleEnableServiceChange,
    handleServiceConfigChange,
    handleIngressChange,
    handleServiceTagChange,
    addServiceTag,
    removeServiceTag,
    clearPermissionError,
  };
}
