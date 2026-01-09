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

// Default service configuration
const defaultServiceConfig: NomadServiceConfig = {
  name: '',
  portLabel: 'http',
  provider: 'nomad',
  addressMode: 'alloc',
  tags: [],
  ingress: {
    enabled: false,
    domain: '',
    enableHttps: true,
    pathPrefix: '',
  },
  useAdvancedMode: false,
};

// Default task group configuration
export const defaultTaskGroupData: TaskGroupFormData = {
  name: '',
  count: 1,
  image: '',
  plugin: 'podman',
  resources: {
    CPU: 100,
    MemoryMB: 256,
    DiskMB: 500,
  },
  envVars: [],
  usePrivateRegistry: false,
  dockerAuth: { username: '', password: '' },
  enableNetwork: false,
  networkMode: 'bridge',
  ports: [{ label: 'http', value: 0, to: 80, static: false }],
  enableHealthCheck: false,
  healthCheck: {
    type: 'http',
    path: '/health',
    interval: 30,
    timeout: 5,
    initialDelay: 5,
    failuresBeforeUnhealthy: 3,
    successesBeforeHealthy: 2,
  },
  enableService: false,
  serviceConfig: { ...defaultServiceConfig },
};

export const defaultFormValues: NomadJobFormData = {
  name: '',
  namespace: 'default',
  taskGroups: [{ ...defaultTaskGroupData }],
  serviceProvider: 'nomad',
  datacenters: ['dc1'],
};

// State type
export interface JobFormState {
  formData: NomadJobFormData | null;
  initialJob: NomadJob | null;
  isLoading: boolean;
  isSaving: boolean;
  isLoadingNamespaces: boolean;
  isNameValid: boolean;
  error: string | null;
  permissionError: string | null;
  success: string | null;
  namespaces: string[];
  // Plan state
  isPlanning: boolean;
  showPlanPreview: boolean;
  planResult: NomadJobPlanResponse | null;
  planError: string | null;
}

// Action types
type JobFormAction =
  | { type: 'SET_FORM_DATA'; payload: NomadJobFormData | null }
  | { type: 'SET_INITIAL_JOB'; payload: NomadJob | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_LOADING_NAMESPACES'; payload: boolean }
  | { type: 'SET_NAME_VALID'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PERMISSION_ERROR'; payload: string | null }
  | { type: 'SET_SUCCESS'; payload: string | null }
  | { type: 'SET_NAMESPACES'; payload: string[] }
  | { type: 'SET_PLANNING'; payload: boolean }
  | { type: 'SET_SHOW_PLAN_PREVIEW'; payload: boolean }
  | { type: 'SET_PLAN_RESULT'; payload: NomadJobPlanResponse | null }
  | { type: 'SET_PLAN_ERROR'; payload: string | null }
  | { type: 'UPDATE_FIELD'; payload: { field: keyof NomadJobFormData; value: unknown } }
  | { type: 'UPDATE_TASK_GROUP'; payload: { groupIndex: number; updates: Partial<TaskGroupFormData> } }
  | { type: 'ADD_TASK_GROUP'; payload: TaskGroupFormData }
  | { type: 'REMOVE_TASK_GROUP'; payload: number }
  | { type: 'UPDATE_ENV_VAR'; payload: { groupIndex: number; varIndex: number; field: 'key' | 'value'; value: string } }
  | { type: 'ADD_ENV_VAR'; payload: number }
  | { type: 'REMOVE_ENV_VAR'; payload: { groupIndex: number; varIndex: number } }
  | { type: 'UPDATE_PORT'; payload: { groupIndex: number; portIndex: number; field: keyof NomadPort; value: string } }
  | { type: 'ADD_PORT'; payload: number }
  | { type: 'REMOVE_PORT'; payload: { groupIndex: number; portIndex: number } }
  | { type: 'UPDATE_HEALTH_CHECK'; payload: { groupIndex: number; field: keyof NomadHealthCheck; value: string | number } }
  | { type: 'UPDATE_SERVICE_CONFIG'; payload: { groupIndex: number; config: Partial<NomadServiceConfig> } }
  | { type: 'UPDATE_INGRESS'; payload: { groupIndex: number; field: keyof IngressConfig; value: string | boolean } }
  | { type: 'UPDATE_SERVICE_TAG'; payload: { groupIndex: number; tagIndex: number; field: 'key' | 'value'; value: string } }
  | { type: 'ADD_SERVICE_TAG'; payload: number }
  | { type: 'REMOVE_SERVICE_TAG'; payload: { groupIndex: number; tagIndex: number } }
  | { type: 'ENABLE_NETWORK'; payload: { groupIndex: number; enabled: boolean } }
  | { type: 'ENABLE_SERVICE'; payload: { groupIndex: number; enabled: boolean } }
  | { type: 'RESET_PLAN' };

// Initial state
export const initialState: JobFormState = {
  formData: null,
  initialJob: null,
  isLoading: false,
  isSaving: false,
  isLoadingNamespaces: true,
  isNameValid: true,
  error: null,
  permissionError: null,
  success: null,
  namespaces: ['default'],
  isPlanning: false,
  showPlanPreview: false,
  planResult: null,
  planError: null,
};

// Helper to update a task group
function updateTaskGroup(
  formData: NomadJobFormData,
  groupIndex: number,
  updater: (group: TaskGroupFormData) => TaskGroupFormData
): NomadJobFormData {
  const updatedGroups = [...formData.taskGroups];
  updatedGroups[groupIndex] = updater(updatedGroups[groupIndex]);
  return { ...formData, taskGroups: updatedGroups };
}

// Reducer
export function jobFormReducer(state: JobFormState, action: JobFormAction): JobFormState {
  switch (action.type) {
    case 'SET_FORM_DATA':
      return { ...state, formData: action.payload };

    case 'SET_INITIAL_JOB':
      return { ...state, initialJob: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };

    case 'SET_LOADING_NAMESPACES':
      return { ...state, isLoadingNamespaces: action.payload };

    case 'SET_NAME_VALID':
      return { ...state, isNameValid: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_PERMISSION_ERROR':
      return { ...state, permissionError: action.payload };

    case 'SET_SUCCESS':
      return { ...state, success: action.payload };

    case 'SET_NAMESPACES':
      return { ...state, namespaces: action.payload };

    case 'SET_PLANNING':
      return { ...state, isPlanning: action.payload };

    case 'SET_SHOW_PLAN_PREVIEW':
      return { ...state, showPlanPreview: action.payload };

    case 'SET_PLAN_RESULT':
      return { ...state, planResult: action.payload };

    case 'SET_PLAN_ERROR':
      return { ...state, planError: action.payload };

    case 'RESET_PLAN':
      return { ...state, showPlanPreview: false, planResult: null, planError: null };

    case 'UPDATE_FIELD':
      if (!state.formData) return state;
      return {
        ...state,
        formData: { ...state.formData, [action.payload.field]: action.payload.value },
      };

    case 'UPDATE_TASK_GROUP':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => ({
          ...group,
          ...action.payload.updates,
        })),
      };

    case 'ADD_TASK_GROUP':
      if (!state.formData) return state;
      return {
        ...state,
        formData: {
          ...state.formData,
          taskGroups: [...state.formData.taskGroups, action.payload],
        },
      };

    case 'REMOVE_TASK_GROUP':
      if (!state.formData || state.formData.taskGroups.length <= 1) return state;
      return {
        ...state,
        formData: {
          ...state.formData,
          taskGroups: state.formData.taskGroups.filter((_, i) => i !== action.payload),
        },
      };

    case 'UPDATE_ENV_VAR':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => {
          const envVars = [...(group.envVars || [])];
          if (!envVars[action.payload.varIndex]) {
            envVars[action.payload.varIndex] = { key: '', value: '' };
          }
          envVars[action.payload.varIndex] = {
            ...envVars[action.payload.varIndex],
            [action.payload.field]: action.payload.value,
          };
          return { ...group, envVars };
        }),
      };

    case 'ADD_ENV_VAR':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload, (group) => ({
          ...group,
          envVars: [...(group.envVars || []), { key: '', value: '' }],
        })),
      };

    case 'REMOVE_ENV_VAR':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => {
          const envVars = [...(group.envVars || [])];
          if (envVars.length <= 1) return { ...group, envVars: [] };
          envVars.splice(action.payload.varIndex, 1);
          return { ...group, envVars };
        }),
      };

    case 'UPDATE_PORT':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => {
          const ports = [...group.ports];
          const { portIndex, field, value } = action.payload;
          if (field === 'static') {
            const isStatic = value === 'true';
            ports[portIndex] = { ...ports[portIndex], static: isStatic };
            if (isStatic && !ports[portIndex].value) {
              ports[portIndex].value = 8080 + portIndex;
            }
          } else if (field === 'label') {
            ports[portIndex] = { ...ports[portIndex], label: value };
          } else {
            ports[portIndex] = { ...ports[portIndex], [field]: parseInt(value, 10) || 0 };
          }
          return { ...group, ports };
        }),
      };

    case 'ADD_PORT':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload, (group) => ({
          ...group,
          ports: [...group.ports, { label: '', value: 0, to: 8080, static: false }],
        })),
      };

    case 'REMOVE_PORT':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => {
          if (group.ports.length <= 1) {
            return { ...group, ports: [{ label: '', value: 0, to: 0, static: false }] };
          }
          const ports = [...group.ports];
          ports.splice(action.payload.portIndex, 1);
          return { ...group, ports };
        }),
      };

    case 'UPDATE_HEALTH_CHECK':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => {
          const healthCheck = group.healthCheck || { ...defaultTaskGroupData.healthCheck! };
          const { field, value } = action.payload;
          return {
            ...group,
            healthCheck: {
              ...healthCheck,
              [field]:
                field === 'type'
                  ? (value as 'http' | 'tcp' | 'script')
                  : typeof value === 'string'
                    ? value
                    : parseInt(String(value), 10) || 0,
            },
          };
        }),
      };

    case 'UPDATE_SERVICE_CONFIG':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => ({
          ...group,
          serviceConfig: {
            ...(group.serviceConfig || defaultServiceConfig),
            ...action.payload.config,
          },
        })),
      };

    case 'UPDATE_INGRESS':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => ({
          ...group,
          serviceConfig: {
            ...(group.serviceConfig || defaultServiceConfig),
            ingress: {
              ...(group.serviceConfig?.ingress || defaultServiceConfig.ingress),
              [action.payload.field]: action.payload.value,
            },
          },
        })),
      };

    case 'UPDATE_SERVICE_TAG':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => {
          const tags = [...(group.serviceConfig?.tags || [])];
          if (!tags[action.payload.tagIndex]) {
            tags[action.payload.tagIndex] = { key: '', value: '' };
          }
          tags[action.payload.tagIndex] = {
            ...tags[action.payload.tagIndex],
            [action.payload.field]: action.payload.value,
          };
          return {
            ...group,
            serviceConfig: {
              ...(group.serviceConfig || defaultServiceConfig),
              tags,
            },
          };
        }),
      };

    case 'ADD_SERVICE_TAG':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload, (group) => ({
          ...group,
          serviceConfig: {
            ...(group.serviceConfig || defaultServiceConfig),
            tags: [...(group.serviceConfig?.tags || []), { key: '', value: '' }],
          },
        })),
      };

    case 'REMOVE_SERVICE_TAG':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => {
          const tags = [...(group.serviceConfig?.tags || [])];
          if (tags.length <= 1) {
            return {
              ...group,
              serviceConfig: {
                ...(group.serviceConfig || defaultServiceConfig),
                tags: [],
              },
            };
          }
          tags.splice(action.payload.tagIndex, 1);
          return {
            ...group,
            serviceConfig: {
              ...(group.serviceConfig || defaultServiceConfig),
              tags,
            },
          };
        }),
      };

    case 'ENABLE_NETWORK':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => {
          const updates: Partial<TaskGroupFormData> = {
            enableNetwork: action.payload.enabled,
          };
          if (!action.payload.enabled) {
            updates.enableService = false;
            if (group.serviceConfig?.ingress) {
              updates.serviceConfig = {
                ...(group.serviceConfig || defaultServiceConfig),
                ingress: {
                  ...group.serviceConfig.ingress,
                  enabled: false,
                },
              };
            }
          }
          return { ...group, ...updates };
        }),
      };

    case 'ENABLE_SERVICE':
      if (!state.formData) return state;
      return {
        ...state,
        formData: updateTaskGroup(state.formData, action.payload.groupIndex, (group) => {
          const updates: Partial<TaskGroupFormData> = {
            enableService: action.payload.enabled,
            serviceConfig: group.serviceConfig || { ...defaultServiceConfig },
          };
          if (action.payload.enabled && !group.enableNetwork) {
            updates.enableNetwork = true;
            updates.networkMode = 'bridge';
            if (!group.ports || group.ports.length === 0 || !group.ports[0].label) {
              updates.ports = [{ label: 'http', value: 0, to: 80, static: false }];
            }
          }
          return { ...group, ...updates };
        }),
      };

    default:
      return state;
  }
}

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

// Export action creators for convenience
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
