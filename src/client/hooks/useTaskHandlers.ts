import { useCallback } from 'react';
import { useJobFormContext, jobFormActions } from '../context/JobFormContext';

/**
 * Hook that provides handlers for a specific task within a task group.
 * Used by TaskForm to manage task-level fields.
 */
export function useTaskHandlers(groupIndex: number, taskIndex: number) {
  const { state, dispatch } = useJobFormContext();
  const task = state.formData?.taskGroups[groupIndex]?.tasks[taskIndex];

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (!state.formData) return;
      const { name, value, type } = e.target;
      const parts = name.split('.');
      const currentTask = state.formData.taskGroups[groupIndex]?.tasks[taskIndex];
      if (!currentTask) return;

      if (parts.length === 1) {
        dispatch(jobFormActions.updateTask(groupIndex, taskIndex, { [name]: type === 'number' ? Number(value) : value }));
      } else if (parts[0] === 'resources') {
        dispatch(jobFormActions.updateTask(groupIndex, taskIndex, {
          resources: { ...currentTask.resources, [parts[1]]: parseInt(value, 10) },
        }));
      } else if (parts[0] === 'dockerAuth') {
        dispatch(jobFormActions.updateTask(groupIndex, taskIndex, {
          dockerAuth: { ...currentTask.dockerAuth!, [parts[1]]: value },
        }));
      }
    },
    [state.formData, groupIndex, taskIndex, dispatch]
  );

  const onCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = e.target as HTMLInputElement;
      dispatch(jobFormActions.updateTask(groupIndex, taskIndex, { [target.name]: target.checked }));
    },
    [groupIndex, taskIndex, dispatch]
  );

  const onEnvVarChange = useCallback(
    (varIndex: number, field: 'key' | 'value', value: string) => {
      dispatch(jobFormActions.updateTaskEnvVar(groupIndex, taskIndex, varIndex, field, value));
    },
    [groupIndex, taskIndex, dispatch]
  );

  const onAddEnvVar = useCallback(() => {
    dispatch(jobFormActions.addTaskEnvVar(groupIndex, taskIndex));
  }, [groupIndex, taskIndex, dispatch]);

  const onRemoveEnvVar = useCallback(
    (varIndex: number) => {
      dispatch(jobFormActions.removeTaskEnvVar(groupIndex, taskIndex, varIndex));
    },
    [groupIndex, taskIndex, dispatch]
  );

  const onRemoveTask = useCallback(() => {
    dispatch(jobFormActions.removeTask(groupIndex, taskIndex));
  }, [groupIndex, taskIndex, dispatch]);

  return {
    task,
    onInputChange,
    onCheckboxChange,
    onEnvVarChange,
    onAddEnvVar,
    onRemoveEnvVar,
    onRemoveTask,
  };
}
