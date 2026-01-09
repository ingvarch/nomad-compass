/**
 * Job form context provider and hooks.
 *
 * This module provides React context for job form state management.
 * Reducer logic is in jobFormReducer.ts, defaults in jobFormDefaults.ts.
 */
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  NomadJobFormData,
  TaskGroupFormData,
  NomadJob,
  NomadJobPlanResponse,
  NomadPort,
  NomadHealthCheck,
  NomadServiceConfig,
  IngressConfig,
} from '../types/nomad';
import { jobFormReducer, initialState, JobFormState, JobFormAction } from './jobFormReducer';

// Re-export from submodules for backward compatibility
export { defaultTaskGroupData, defaultFormValues } from './jobFormDefaults';
export { jobFormReducer, initialState } from './jobFormReducer';
export type { JobFormState, JobFormAction } from './jobFormReducer';

// Context type
interface JobFormContextType {
  state: JobFormState;
  dispatch: React.Dispatch<JobFormAction>;
}

const JobFormContext = createContext<JobFormContextType | null>(null);

// Provider props
interface JobFormProviderProps {
  children: ReactNode;
  initialFormData?: NomadJobFormData | null;
  initialLoading?: boolean;
}

// Provider component
export function JobFormProvider({ children, initialFormData = null, initialLoading = false }: JobFormProviderProps) {
  const [state, dispatch] = useReducer(jobFormReducer, {
    ...initialState,
    formData: initialFormData,
    isLoading: initialLoading,
  });

  return (
    <JobFormContext.Provider value={{ state, dispatch }}>
      {children}
    </JobFormContext.Provider>
  );
}

// Hook to use the context
export function useJobFormContext() {
  const context = useContext(JobFormContext);
  if (!context) {
    throw new Error('useJobFormContext must be used within a JobFormProvider');
  }
  return context;
}

// Action creators for convenience
export const jobFormActions = {
  setFormData: (data: NomadJobFormData | null): JobFormAction => ({ type: 'SET_FORM_DATA', payload: data }),
  setInitialJob: (job: NomadJob | null): JobFormAction => ({ type: 'SET_INITIAL_JOB', payload: job }),
  setLoading: (loading: boolean): JobFormAction => ({ type: 'SET_LOADING', payload: loading }),
  setSaving: (saving: boolean): JobFormAction => ({ type: 'SET_SAVING', payload: saving }),
  setLoadingNamespaces: (loading: boolean): JobFormAction => ({ type: 'SET_LOADING_NAMESPACES', payload: loading }),
  setNameValid: (valid: boolean): JobFormAction => ({ type: 'SET_NAME_VALID', payload: valid }),
  setError: (error: string | null): JobFormAction => ({ type: 'SET_ERROR', payload: error }),
  setPermissionError: (error: string | null): JobFormAction => ({ type: 'SET_PERMISSION_ERROR', payload: error }),
  setSuccess: (success: string | null): JobFormAction => ({ type: 'SET_SUCCESS', payload: success }),
  setNamespaces: (namespaces: string[]): JobFormAction => ({ type: 'SET_NAMESPACES', payload: namespaces }),
  setPlanning: (planning: boolean): JobFormAction => ({ type: 'SET_PLANNING', payload: planning }),
  setShowPlanPreview: (show: boolean): JobFormAction => ({ type: 'SET_SHOW_PLAN_PREVIEW', payload: show }),
  setPlanResult: (result: NomadJobPlanResponse | null): JobFormAction => ({ type: 'SET_PLAN_RESULT', payload: result }),
  setPlanError: (error: string | null): JobFormAction => ({ type: 'SET_PLAN_ERROR', payload: error }),
  resetPlan: (): JobFormAction => ({ type: 'RESET_PLAN' }),
  updateField: (field: keyof NomadJobFormData, value: unknown): JobFormAction => ({ type: 'UPDATE_FIELD', payload: { field, value } }),
  updateTaskGroup: (groupIndex: number, updates: Partial<TaskGroupFormData>): JobFormAction => ({ type: 'UPDATE_TASK_GROUP', payload: { groupIndex, updates } }),
  addTaskGroup: (group: TaskGroupFormData): JobFormAction => ({ type: 'ADD_TASK_GROUP', payload: group }),
  removeTaskGroup: (index: number): JobFormAction => ({ type: 'REMOVE_TASK_GROUP', payload: index }),
  updateEnvVar: (groupIndex: number, varIndex: number, field: 'key' | 'value', value: string): JobFormAction => ({ type: 'UPDATE_ENV_VAR', payload: { groupIndex, varIndex, field, value } }),
  addEnvVar: (groupIndex: number): JobFormAction => ({ type: 'ADD_ENV_VAR', payload: groupIndex }),
  removeEnvVar: (groupIndex: number, varIndex: number): JobFormAction => ({ type: 'REMOVE_ENV_VAR', payload: { groupIndex, varIndex } }),
  updatePort: (groupIndex: number, portIndex: number, field: keyof NomadPort, value: string): JobFormAction => ({ type: 'UPDATE_PORT', payload: { groupIndex, portIndex, field, value } }),
  addPort: (groupIndex: number): JobFormAction => ({ type: 'ADD_PORT', payload: groupIndex }),
  removePort: (groupIndex: number, portIndex: number): JobFormAction => ({ type: 'REMOVE_PORT', payload: { groupIndex, portIndex } }),
  updateHealthCheck: (groupIndex: number, field: keyof NomadHealthCheck, value: string | number): JobFormAction => ({ type: 'UPDATE_HEALTH_CHECK', payload: { groupIndex, field, value } }),
  updateServiceConfig: (groupIndex: number, config: Partial<NomadServiceConfig>): JobFormAction => ({ type: 'UPDATE_SERVICE_CONFIG', payload: { groupIndex, config } }),
  updateIngress: (groupIndex: number, field: keyof IngressConfig, value: string | boolean): JobFormAction => ({ type: 'UPDATE_INGRESS', payload: { groupIndex, field, value } }),
  updateServiceTag: (groupIndex: number, tagIndex: number, field: 'key' | 'value', value: string): JobFormAction => ({ type: 'UPDATE_SERVICE_TAG', payload: { groupIndex, tagIndex, field, value } }),
  addServiceTag: (groupIndex: number): JobFormAction => ({ type: 'ADD_SERVICE_TAG', payload: groupIndex }),
  removeServiceTag: (groupIndex: number, tagIndex: number): JobFormAction => ({ type: 'REMOVE_SERVICE_TAG', payload: { groupIndex, tagIndex } }),
  enableNetwork: (groupIndex: number, enabled: boolean): JobFormAction => ({ type: 'ENABLE_NETWORK', payload: { groupIndex, enabled } }),
  enableService: (groupIndex: number, enabled: boolean): JobFormAction => ({ type: 'ENABLE_SERVICE', payload: { groupIndex, enabled } }),
};
