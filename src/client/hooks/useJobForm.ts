// src/hooks/useJobForm.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { createNomadClient } from '../lib/api/nomad';
import { isPermissionError, getPermissionErrorMessage } from '../lib/api/errors';
import {
  NomadJobFormData,
  TaskGroupFormData,
  NomadPort,
  NomadHealthCheck,
  NomadJob,
  NomadJobPlanResponse,
  NomadServiceConfig,
  IngressConfig,
} from '../types/nomad';
import { createJobSpec, updateJobSpec, convertJobToFormData } from '../lib/services/jobSpecService';
import { validateJobName } from '../lib/services/validationService';
import { useToast } from '../context/ToastContext';
import { useDeploymentTracker } from './useDeploymentTracker';

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

interface UseJobFormOptions {
  mode: 'create' | 'edit';
  jobId?: string;
  namespace?: string;
}

export function useJobForm({ mode, jobId, namespace = 'default' }: UseJobFormOptions) {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const deploymentTracker = useDeploymentTracker();

  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [namespaces, setNamespaces] = useState<string[]>(['default']);
  const [isLoadingNamespaces, setIsLoadingNamespaces] = useState(true);
  const [isNameValid, setIsNameValid] = useState(true);
  const [initialJob, setInitialJob] = useState<NomadJob | null>(null);
  const [formData, setFormData] = useState<NomadJobFormData | null>(
    mode === 'create' ? defaultFormValues : null
  );

  // Plan (dry-run) state
  const [isPlanning, setIsPlanning] = useState(false);
  const [showPlanPreview, setShowPlanPreview] = useState(false);
  const [planResult, setPlanResult] = useState<NomadJobPlanResponse | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // Fetch available namespaces
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoadingNamespaces(false);
      return;
    }

    const client = createNomadClient();
    client
      .getNamespaces()
      .then((response) => {
        if (response && Array.isArray(response)) {
          const nsNames = response.map((ns) => ns.Name);
          setNamespaces(nsNames.length > 0 ? nsNames : ['default']);
        }
      })
      .catch(() => setNamespaces(['default']))
      .finally(() => setIsLoadingNamespaces(false));
  }, [isAuthenticated]);

  // Fetch job data (edit mode only)
  const fetchJobData = useCallback(async () => {
    if (mode !== 'edit' || !isAuthenticated || !jobId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const client = createNomadClient();
      const jobData = await client.getJob(jobId, namespace);
      setInitialJob(jobData);

      const formattedData = convertJobToFormData(jobData);
      formattedData.taskGroups = formattedData.taskGroups.map((group) => ({
        ...group,
        envVars: group.envVars || [],
      }));

      setFormData(formattedData);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load job details';
      setError(message);
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [mode, isAuthenticated, jobId, namespace, addToast]);

  useEffect(() => {
    if (mode === 'edit') {
      fetchJobData();
    }
  }, [mode, fetchJobData]);

  // Generic group field updater
  const updateGroup = (
    groupIndex: number,
    updater: (group: TaskGroupFormData) => TaskGroupFormData
  ) => {
    if (!formData) return;
    const updatedGroups = [...formData.taskGroups];
    updatedGroups[groupIndex] = updater(updatedGroups[groupIndex]);
    setFormData({ ...formData, taskGroups: updatedGroups });
  };

  // Handle job-level form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!formData) return;
    const { name, value, type } = e.target;

    if (name === 'name' && mode === 'create') {
      setIsNameValid(validateJobName(value));
    }

    if (name === 'datacenters') {
      setFormData({
        ...formData,
        datacenters: value.split(',').map((dc) => dc.trim()),
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'number' ? Number(value) : value,
      });
    }
  };

  // Handle task group-specific input changes
  const handleGroupInputChange = (
    groupIndex: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!formData) return;
    const { name, value, type } = e.target;
    const parts = name.split('.');

    updateGroup(groupIndex, (group) => {
      if (parts.length === 1) {
        return { ...group, [name]: type === 'number' ? Number(value) : value };
      }
      if (parts[0] === 'resources') {
        return {
          ...group,
          resources: { ...group.resources, [parts[1]]: parseInt(value, 10) },
        };
      }
      if (parts[0] === 'dockerAuth') {
        return {
          ...group,
          dockerAuth: { ...group.dockerAuth!, [parts[1]]: value },
        };
      }
      if (parts[0] === 'healthCheck') {
        return {
          ...group,
          healthCheck: {
            ...group.healthCheck!,
            [parts[1]]: type === 'number' ? parseInt(value, 10) : value,
          },
        };
      }
      return group;
    });
  };

  const handleSelectChange = (
    groupIndex: number,
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateGroup(groupIndex, (group) => ({
      ...group,
      [e.target.name]: e.target.value,
    }));
  };

  const handleGroupCheckboxChange = (
    groupIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateGroup(groupIndex, (group) => ({
      ...group,
      [e.target.name]: e.target.checked,
    }));
  };

  // Task group management
  const addTaskGroup = () => {
    if (!formData) return;
    const newGroup: TaskGroupFormData = {
      ...defaultTaskGroupData,
      name: `${formData.name ? formData.name + '-' : ''}group-${formData.taskGroups.length + 1}`,
    };
    setFormData({ ...formData, taskGroups: [...formData.taskGroups, newGroup] });
  };

  const removeTaskGroup = (groupIndex: number) => {
    if (!formData || formData.taskGroups.length <= 1) return;
    const updatedGroups = [...formData.taskGroups];
    updatedGroups.splice(groupIndex, 1);
    setFormData({ ...formData, taskGroups: updatedGroups });
  };

  // Environment variables
  const handleEnvVarChange = (
    groupIndex: number,
    varIndex: number,
    field: 'key' | 'value',
    value: string
  ) => {
    updateGroup(groupIndex, (group) => {
      const envVars = [...(group.envVars || [])];
      if (!envVars[varIndex]) envVars[varIndex] = { key: '', value: '' };
      envVars[varIndex] = { ...envVars[varIndex], [field]: value };
      return { ...group, envVars };
    });
  };

  const addEnvVar = useCallback((groupIndex: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const updatedGroups = [...prev.taskGroups];
      updatedGroups[groupIndex] = {
        ...updatedGroups[groupIndex],
        envVars: [...(updatedGroups[groupIndex].envVars || []), { key: '', value: '' }],
      };
      return { ...prev, taskGroups: updatedGroups };
    });
  }, []);

  const removeEnvVar = (groupIndex: number, varIndex: number) => {
    updateGroup(groupIndex, (group) => {
      const envVars = [...(group.envVars || [])];
      if (envVars.length <= 1) return { ...group, envVars: [] };
      envVars.splice(varIndex, 1);
      return { ...group, envVars };
    });
  };

  // Ports
  const handlePortChange = (
    groupIndex: number,
    portIndex: number,
    field: keyof NomadPort,
    value: string
  ) => {
    updateGroup(groupIndex, (group) => {
      const ports = [...group.ports];
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
    });
  };

  const addPort = (groupIndex: number) => {
    updateGroup(groupIndex, (group) => ({
      ...group,
      ports: [...group.ports, { label: '', value: 0, to: 8080, static: false }],
    }));
  };

  const removePort = (groupIndex: number, portIndex: number) => {
    updateGroup(groupIndex, (group) => {
      if (group.ports.length <= 1) {
        return { ...group, ports: [{ label: '', value: 0, to: 0, static: false }] };
      }
      const ports = [...group.ports];
      ports.splice(portIndex, 1);
      return { ...group, ports };
    });
  };

  // Health check
  const handleHealthCheckChange = (
    groupIndex: number,
    field: keyof NomadHealthCheck,
    value: string | number
  ) => {
    updateGroup(groupIndex, (group) => {
      const healthCheck = group.healthCheck || { ...defaultTaskGroupData.healthCheck! };
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
    });
  };

  // Network Configuration handler
  const handleEnableNetworkChange = (groupIndex: number, enabled: boolean) => {
    updateGroup(groupIndex, (group) => {
      const updates: Partial<TaskGroupFormData> = {
        enableNetwork: enabled,
      };

      // Auto-disable Service Discovery and Ingress when network is disabled
      if (!enabled) {
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
    });
  };

  // Service Discovery & Ingress handlers
  const handleEnableServiceChange = (groupIndex: number, enabled: boolean) => {
    updateGroup(groupIndex, (group) => {
      const updates: Partial<TaskGroupFormData> = {
        enableService: enabled,
        serviceConfig: group.serviceConfig || { ...defaultServiceConfig },
      };

      // Auto-enable network configuration when service discovery is enabled
      if (enabled && !group.enableNetwork) {
        updates.enableNetwork = true;
        updates.networkMode = 'bridge';
        // Set default port if no ports configured
        if (!group.ports || group.ports.length === 0 || !group.ports[0].label) {
          updates.ports = [{ label: 'http', value: 0, to: 80, static: false }];
        }
      }

      return { ...group, ...updates };
    });
  };

  const handleServiceConfigChange = (
    groupIndex: number,
    config: Partial<NomadServiceConfig>
  ) => {
    updateGroup(groupIndex, (group) => ({
      ...group,
      serviceConfig: {
        ...(group.serviceConfig || defaultServiceConfig),
        ...config,
      },
    }));
  };

  const handleIngressChange = (
    groupIndex: number,
    field: keyof IngressConfig,
    value: string | boolean
  ) => {
    updateGroup(groupIndex, (group) => ({
      ...group,
      serviceConfig: {
        ...(group.serviceConfig || defaultServiceConfig),
        ingress: {
          ...(group.serviceConfig?.ingress || defaultServiceConfig.ingress),
          [field]: value,
        },
      },
    }));
  };

  const handleServiceTagChange = (
    groupIndex: number,
    tagIndex: number,
    field: 'key' | 'value',
    value: string
  ) => {
    updateGroup(groupIndex, (group) => {
      const tags = [...(group.serviceConfig?.tags || [])];
      if (!tags[tagIndex]) tags[tagIndex] = { key: '', value: '' };
      tags[tagIndex] = { ...tags[tagIndex], [field]: value };
      return {
        ...group,
        serviceConfig: {
          ...(group.serviceConfig || defaultServiceConfig),
          tags,
        },
      };
    });
  };

  const addServiceTag = (groupIndex: number) => {
    updateGroup(groupIndex, (group) => ({
      ...group,
      serviceConfig: {
        ...(group.serviceConfig || defaultServiceConfig),
        tags: [...(group.serviceConfig?.tags || []), { key: '', value: '' }],
      },
    }));
  };

  const removeServiceTag = (groupIndex: number, tagIndex: number) => {
    updateGroup(groupIndex, (group) => {
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
      tags.splice(tagIndex, 1);
      return {
        ...group,
        serviceConfig: {
          ...(group.serviceConfig || defaultServiceConfig),
          tags,
        },
      };
    });
  };

  // Form validation
  const validateForm = (): string | null => {
    if (!formData) return 'Form data is missing';

    if (mode === 'create') {
      if (!formData.name.trim()) return 'Job name is required';
      if (!validateJobName(formData.name)) {
        setIsNameValid(false);
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
  };

  // Clean empty env vars before submit
  const cleanFormData = (data: NomadJobFormData): NomadJobFormData => ({
    ...data,
    taskGroups: data.taskGroups.map((group) => ({
      ...group,
      envVars: (group.envVars || []).filter(
        (ev) => ev.key.trim() !== '' || ev.value.trim() !== ''
      ),
    })),
  });

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isAuthenticated || !formData) {
      setError('Authentication required');
      return;
    }

    setIsSaving(true);
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

      // Start deployment tracking
      const evalId = response.EvalID;
      const targetJobId = mode === 'create' ? formData.name : jobId!;
      const targetNamespace = formData.namespace;

      if (evalId) {
        deploymentTracker.startTracking(targetJobId, targetNamespace, evalId);
      } else {
        // Fallback if no EvalID (shouldn't happen)
        setSuccess(`Job "${formData.name}" ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      }
    } catch (err) {
      if (isPermissionError(err)) {
        setPermissionError(getPermissionErrorMessage(mode === 'create' ? 'create-job' : 'update-job'));
      } else {
        const message = err instanceof Error ? err.message : `Failed to ${mode} job`;
        setError(message);
        addToast(message, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const clearPermissionError = () => setPermissionError(null);

  // Plan (dry-run) handler
  const handlePlan = async () => {
    setPlanError(null);
    setPlanResult(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isAuthenticated || !formData) {
      setError('Authentication required');
      return;
    }

    setIsPlanning(true);
    setShowPlanPreview(true);

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
      setPlanResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to plan job';
      setPlanError(message);
    } finally {
      setIsPlanning(false);
    }
  };

  // Submit from plan preview (after user confirms)
  const handleSubmitFromPlan = async () => {
    setShowPlanPreview(false);
    // Trigger normal submit
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSubmit(fakeEvent);
  };

  const closePlanPreview = () => {
    setShowPlanPreview(false);
    setPlanResult(null);
    setPlanError(null);
  };

  return {
    formData,
    initialJob,
    isLoading,
    isSaving,
    isLoadingNamespaces,
    isNameValid,
    error,
    permissionError,
    clearPermissionError,
    success,
    namespaces,
    deploymentTracker,
    handleInputChange,
    handleGroupInputChange,
    handleSelectChange,
    handleGroupCheckboxChange,
    handleEnvVarChange,
    addEnvVar,
    removeEnvVar,
    handlePortChange,
    addPort,
    removePort,
    handleHealthCheckChange,
    addTaskGroup,
    removeTaskGroup,
    handleSubmit,
    // Network Configuration
    handleEnableNetworkChange,
    // Service Discovery & Ingress
    handleEnableServiceChange,
    handleServiceConfigChange,
    handleIngressChange,
    handleServiceTagChange,
    addServiceTag,
    removeServiceTag,
    // Plan functions
    handlePlan,
    handleSubmitFromPlan,
    closePlanPreview,
    isPlanning,
    showPlanPreview,
    planResult,
    planError,
  };
}
