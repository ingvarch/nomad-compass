import { useCallback } from 'react';
import { useJobFormContext, jobFormActions } from '../context/JobFormContext';
import { validateJobName } from '../lib/services/validationService';

interface UseJobFormHandlersOptions {
  mode: 'create' | 'edit';
}

/**
 * Hook for job-level form handlers.
 * Task group handlers are in useTaskGroupHandlers.ts
 */
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

  // Permission error
  const clearPermissionError = useCallback(() => {
    dispatch(jobFormActions.setPermissionError(null));
  }, [dispatch]);

  return {
    handleInputChange,
    clearPermissionError,
  };
}
