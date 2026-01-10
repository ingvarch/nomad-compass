import { useCallback } from 'react';
import { useJobFormContext, jobFormActions } from '../context/JobFormContext';
import {
  NomadPort,
  NomadHealthCheck,
  NomadServiceConfig,
  IngressConfig,
} from '../types/nomad';

/**
 * Hook that provides handlers for a specific task group.
 * Used by TaskGroupForm to avoid props drilling.
 */
export function useTaskGroupHandlers(groupIndex: number) {
  const { state, dispatch } = useJobFormContext();
  const group = state.formData?.taskGroups[groupIndex];

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (!state.formData) return;
      const { name, value, type } = e.target;
      const parts = name.split('.');
      const currentGroup = state.formData.taskGroups[groupIndex];

      if (parts.length === 1) {
        dispatch(jobFormActions.updateTaskGroup(groupIndex, { [name]: type === 'number' ? Number(value) : value }));
      } else if (parts[0] === 'resources') {
        dispatch(jobFormActions.updateTaskGroup(groupIndex, {
          resources: { ...currentGroup.resources, [parts[1]]: parseInt(value, 10) },
        }));
      } else if (parts[0] === 'dockerAuth') {
        dispatch(jobFormActions.updateTaskGroup(groupIndex, {
          dockerAuth: { ...currentGroup.dockerAuth!, [parts[1]]: value },
        }));
      } else if (parts[0] === 'healthCheck') {
        dispatch(jobFormActions.updateTaskGroup(groupIndex, {
          healthCheck: {
            ...currentGroup.healthCheck!,
            [parts[1]]: type === 'number' ? parseInt(value, 10) : value,
          },
        }));
      }
    },
    [state.formData, groupIndex, dispatch]
  );

  const onCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = e.target as HTMLInputElement;
      dispatch(jobFormActions.updateTaskGroup(groupIndex, { [target.name]: target.checked }));
    },
    [groupIndex, dispatch]
  );

  // Environment variables
  const onEnvVarChange = useCallback(
    (varIndex: number, field: 'key' | 'value', value: string) => {
      dispatch(jobFormActions.updateEnvVar(groupIndex, varIndex, field, value));
    },
    [groupIndex, dispatch]
  );

  const onAddEnvVar = useCallback(() => {
    dispatch(jobFormActions.addEnvVar(groupIndex));
  }, [groupIndex, dispatch]);

  const onRemoveEnvVar = useCallback(
    (varIndex: number) => {
      dispatch(jobFormActions.removeEnvVar(groupIndex, varIndex));
    },
    [groupIndex, dispatch]
  );

  // Ports
  const onPortChange = useCallback(
    (portIndex: number, field: keyof NomadPort, value: string) => {
      dispatch(jobFormActions.updatePort(groupIndex, portIndex, field, value));
    },
    [groupIndex, dispatch]
  );

  const onAddPort = useCallback(() => {
    dispatch(jobFormActions.addPort(groupIndex));
  }, [groupIndex, dispatch]);

  const onRemovePort = useCallback(
    (portIndex: number) => {
      dispatch(jobFormActions.removePort(groupIndex, portIndex));
    },
    [groupIndex, dispatch]
  );

  // Health check
  const onHealthCheckChange = useCallback(
    (field: keyof NomadHealthCheck, value: string | number) => {
      dispatch(jobFormActions.updateHealthCheck(groupIndex, field, value));
    },
    [groupIndex, dispatch]
  );

  // Network
  const onEnableNetworkChange = useCallback(
    (enabled: boolean) => {
      dispatch(jobFormActions.enableNetwork(groupIndex, enabled));
    },
    [groupIndex, dispatch]
  );

  // Service
  const onEnableServiceChange = useCallback(
    (enabled: boolean) => {
      dispatch(jobFormActions.enableService(groupIndex, enabled));
    },
    [groupIndex, dispatch]
  );

  const onServiceConfigChange = useCallback(
    (config: Partial<NomadServiceConfig>) => {
      dispatch(jobFormActions.updateServiceConfig(groupIndex, config));
    },
    [groupIndex, dispatch]
  );

  const onIngressChange = useCallback(
    (field: keyof IngressConfig, value: string | boolean) => {
      dispatch(jobFormActions.updateIngress(groupIndex, field, value));
    },
    [groupIndex, dispatch]
  );

  // Service tags
  const onTagChange = useCallback(
    (tagIndex: number, field: 'key' | 'value', value: string) => {
      dispatch(jobFormActions.updateServiceTag(groupIndex, tagIndex, field, value));
    },
    [groupIndex, dispatch]
  );

  const onAddTag = useCallback(() => {
    dispatch(jobFormActions.addServiceTag(groupIndex));
  }, [groupIndex, dispatch]);

  const onRemoveTag = useCallback(
    (tagIndex: number) => {
      dispatch(jobFormActions.removeServiceTag(groupIndex, tagIndex));
    },
    [groupIndex, dispatch]
  );

  // Remove group
  const onRemoveGroup = useCallback(() => {
    dispatch(jobFormActions.removeTaskGroup(groupIndex));
  }, [groupIndex, dispatch]);

  return {
    group,
    onInputChange,
    onCheckboxChange,
    onEnvVarChange,
    onAddEnvVar,
    onRemoveEnvVar,
    onPortChange,
    onAddPort,
    onRemovePort,
    onHealthCheckChange,
    onEnableNetworkChange,
    onEnableServiceChange,
    onServiceConfigChange,
    onIngressChange,
    onTagChange,
    onAddTag,
    onRemoveTag,
    onRemoveGroup,
  };
}
