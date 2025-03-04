// src/hooks/useJobEditForm.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import { NomadJobFormData, NomadPort, NomadHealthCheck, NomadEnvVar, NomadJob, TaskFormData } from '@/types/nomad';
import { updateJobSpec } from '@/lib/services/jobSpecService';
import { useToast } from '@/context/ToastContext';
import { defaultTaskData } from '@/hooks/useJobForm';

export function useJobEditForm(jobId: string, namespace: string = 'default') {
    const router = useRouter();
    const { token, nomadAddr } = useAuth();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [namespaces, setNamespaces] = useState<string[]>(['default']);
    const [isLoadingNamespaces, setIsLoadingNamespaces] = useState(true);
    const [initialJob, setInitialJob] = useState<NomadJob | null>(null);
    const [formData, setFormData] = useState<NomadJobFormData | null>(null);

    // Fetch available namespaces
    useEffect(() => {
        const fetchNamespaces = async () => {
            if (!token || !nomadAddr) {
                setIsLoadingNamespaces(false);
                return;
            }

            try {
                const client = createNomadClient(nomadAddr, token);
                const response = await client.getNamespaces();

                if (response && Array.isArray(response)) {
                    const nsNames = response.map(ns => ns.Name);
                    setNamespaces(nsNames.length > 0 ? nsNames : ['default']);
                }
            } catch (err) {
                console.error('Failed to fetch namespaces:', err);
                setNamespaces(['default']);
            } finally {
                setIsLoadingNamespaces(false);
            }
        };

        fetchNamespaces();
    }, [token, nomadAddr]);

    // Fetch job data
    const fetchJobData = useCallback(async () => {
        if (!token || !nomadAddr || !jobId) {
            setError('Authentication or job ID required');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const client = createNomadClient(nomadAddr, token);
            const jobData = await client.getJob(jobId, namespace);
            setInitialJob(jobData);

            // Convert job data to form data
            const formattedData = convertJobToFormData(jobData);
            setFormData(formattedData);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch job details:', err);
            setError(typeof err === 'object' && err !== null && 'message' in err
                ? (err as Error).message
                : 'Failed to load job details. Please check your connection and try again.');
            addToast('Failed to load job details', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [token, nomadAddr, jobId, namespace, addToast]);

    // Initial fetch
    useEffect(() => {
        fetchJobData();
    }, [fetchJobData]);

    // Convert Nomad job data to form data structure
    const convertJobToFormData = (job: NomadJob): NomadJobFormData => {
        if (!job || !job.TaskGroups || job.TaskGroups.length === 0) {
            throw new Error("Invalid job data structure");
        }

        const taskGroup = job.TaskGroups[0];

        // Extract tasks
        const tasks: TaskFormData[] = taskGroup.Tasks.map(task => {
            const config = task.Config || {};

            // Extract environment variables
            const envVars: NomadEnvVar[] = task.Env ?
                Object.entries(task.Env).map(([key, value]) => ({ key, value: value as string })) :
                [{ key: '', value: '' }];

            // Extract Docker auth if present
            const usePrivateRegistry = !!(config.auth && config.auth.username && config.auth.password);

            return {
                name: task.Name,
                image: config.image || '',
                plugin: task.Driver || 'podman',
                resources: {
                    CPU: task.Resources?.CPU || 100,
                    MemoryMB: task.Resources?.MemoryMB || 256,
                    DiskMB: task.Resources?.DiskMB || 500,
                },
                envVars: envVars.length > 0 ? envVars : [{ key: '', value: '' }],
                usePrivateRegistry,
                dockerAuth: usePrivateRegistry ? {
                    username: config.auth.username,
                    password: config.auth.password
                } : {
                    username: '',
                    password: ''
                }
            };
        });

        // Extract network configuration
        const networkConfig = taskGroup.Networks && taskGroup.Networks.length > 0 ? taskGroup.Networks[0] : null;
        const hasDynamicPorts = !!(networkConfig && networkConfig.DynamicPorts && networkConfig.DynamicPorts.length > 0);
        const hasReservedPorts = !!(networkConfig && networkConfig.ReservedPorts && networkConfig.ReservedPorts.length > 0);
        const enablePorts = hasDynamicPorts || hasReservedPorts;

        // Extract network mode and ensure it's a valid value for our type
        let networkMode: 'none' | 'host' | 'bridge' = 'none';
        if (networkConfig && networkConfig.Mode) {
            if (networkConfig.Mode === 'host' || networkConfig.Mode === 'bridge') {
                networkMode = networkConfig.Mode;
            }
        }

        // Extract ports
        let ports: NomadPort[] = [];
        if (networkConfig) {
            // Add dynamic ports
            if (networkConfig.DynamicPorts && networkConfig.DynamicPorts.length > 0) {
                ports = [
                    ...ports,
                    ...networkConfig.DynamicPorts.map(port => ({
                        label: port.Label,
                        value: 0, // Dynamic ports don't have a specific value
                        to: port.To || 0,
                        static: false,
                        taskName: 'TaskName' in port ? (port.TaskName as string) : undefined
                    }))
                ];
            }

            // Add reserved ports
            if (networkConfig.ReservedPorts && networkConfig.ReservedPorts.length > 0) {
                ports = [
                    ...ports,
                    ...networkConfig.ReservedPorts.map(port => ({
                        label: port.Label,
                        value: port.Value,
                        to: port.To || port.Value,
                        static: true,
                        taskName: 'TaskName' in port ? (port.TaskName as string) : undefined
                    }))
                ];
            }
        }

        // If no ports found, add a default one
        if (ports.length === 0) {
            ports = [{ label: 'http', value: 8080, to: 8080, static: false }];
        }

        // Extract health checks and service provider
        const service = taskGroup.Services && taskGroup.Services.length > 0 ? taskGroup.Services[0] : null;
        const healthCheck = service && service.Checks && service.Checks.length > 0 ? service.Checks[0] : null;

        const serviceProvider = service?.Provider || (enablePorts ? 'nomad' : 'consul');

        const healthCheckData: NomadHealthCheck = {
            type: (healthCheck?.Type || 'http') as 'http' | 'tcp' | 'script',
            path: healthCheck?.Type === 'http' ? healthCheck.Path : '/health',
            command: healthCheck?.Type === 'script' ? healthCheck.Command : '',
            interval: healthCheck ? Math.floor(healthCheck.Interval / 1000000000) : 30, // Convert from nanoseconds
            timeout: healthCheck ? Math.floor(healthCheck.Timeout / 1000000000) : 5, // Convert from nanoseconds
            initialDelay: healthCheck?.CheckRestart ? Math.floor(healthCheck.CheckRestart.Grace / 1000000000) : 5,
            failuresBeforeUnhealthy: 3,
            successesBeforeHealthy: 2
        };

        // Build form data
        return {
            name: job.Name,
            namespace: job.Namespace || 'default',
            tasks: tasks,
            ports,
            enablePorts,
            networkMode,
            serviceProvider,
            healthChecks: [healthCheckData],
            enableHealthCheck: !!healthCheck,
            count: taskGroup.Count || 1,
            datacenters: job.Datacenters || ['dc1'],
        };
    };

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!formData) return;

        const { name, value, type } = e.target;
        const newValue = type === 'number' ? Number(value) : value;

        if (name === 'datacenters') {
            // Split comma-separated datacenters into an array
            setFormData({
                ...formData,
                datacenters: value.split(',').map(dc => dc.trim())
            });
        } else {
            setFormData({
                ...formData,
                [name]: newValue
            });
        }
    };

    // Handle task-specific input changes
    const handleTaskInputChange = (taskIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!formData) return;

        const { name, value, type } = e.target;
        const newValue = type === 'number' ? Number(value) : value;

        const updatedTasks = [...formData.tasks];

        // Parse the task property path (e.g., "resources.CPU")
        const parts = name.split('.');

        if (parts.length === 1) {
            // Simple property
            updatedTasks[taskIndex] = {
                ...updatedTasks[taskIndex],
                [name]: newValue
            };
        } else if (parts.length === 2 && parts[0] === 'resources') {
            // Resource property (CPU, MemoryMB, DiskMB)
            const resourceField = parts[1];
            updatedTasks[taskIndex] = {
                ...updatedTasks[taskIndex],
                resources: {
                    ...updatedTasks[taskIndex].resources,
                    [resourceField]: parseInt(value, 10)
                }
            };
        } else if (parts.length === 2 && parts[0] === 'dockerAuth') {
            // Docker auth property
            const authField = parts[1];
            updatedTasks[taskIndex] = {
                ...updatedTasks[taskIndex],
                dockerAuth: {
                    ...updatedTasks[taskIndex].dockerAuth!,
                    [authField]: value
                }
            };
        }

        setFormData({
            ...formData,
            tasks: updatedTasks
        });
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!formData) return;

        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    // Toggle checkbox
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!formData) return;

        const { name, checked } = e.target;

        // If we enable network settings, set the service provider to 'nomad' by default
        if (name === 'enablePorts' && checked) {
            setFormData({
                ...formData,
                [name]: checked,
                serviceProvider: 'nomad'
            });
        } else {
            setFormData({
                ...formData,
                [name]: checked
            });
        }
    };

    // Toggle task-specific checkbox
    const handleTaskCheckboxChange = (taskIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!formData) return;

        const { name, checked } = e.target;

        const updatedTasks = [...formData.tasks];
        updatedTasks[taskIndex] = {
            ...updatedTasks[taskIndex],
            [name]: checked
        };

        setFormData({
            ...formData,
            tasks: updatedTasks
        });
    };

    // Add a new task to the form
    const addTask = () => {
        if (!formData) return;

        const newTask: TaskFormData = {
            ...defaultTaskData,
            name: `${formData.name ? formData.name + '-' : ''}task-${formData.tasks.length + 1}`
        };

        setFormData({
            ...formData,
            tasks: [...formData.tasks, newTask]
        });
    };

    // Remove a task from the form
    const removeTask = (taskIndex: number) => {
        if (!formData || formData.tasks.length <= 1) {
            // Don't remove the last task
            return;
        }

        const updatedTasks = [...formData.tasks];
        updatedTasks.splice(taskIndex, 1);

        setFormData({
            ...formData,
            tasks: updatedTasks
        });
    };

    // Handle environment variable changes for a specific task
    const handleEnvVarChange = (taskIndex: number, varIndex: number, field: 'key' | 'value', value: string) => {
        if (!formData) return;

        const updatedTasks = [...formData.tasks];
        const updatedEnvVars = [...updatedTasks[taskIndex].envVars];

        updatedEnvVars[varIndex] = {
            ...updatedEnvVars[varIndex],
            [field]: value
        };

        updatedTasks[taskIndex] = {
            ...updatedTasks[taskIndex],
            envVars: updatedEnvVars
        };

        setFormData({
            ...formData,
            tasks: updatedTasks
        });
    };

    // Add a new environment variable field to a specific task
    const addEnvVar = (taskIndex: number) => {
        if (!formData) return;

        const updatedTasks = [...formData.tasks];
        updatedTasks[taskIndex] = {
            ...updatedTasks[taskIndex],
            envVars: [...updatedTasks[taskIndex].envVars, { key: '', value: '' }]
        };

        setFormData({
            ...formData,
            tasks: updatedTasks
        });
    };

    // Remove an environment variable field from a specific task
    const removeEnvVar = (taskIndex: number, varIndex: number) => {
        if (!formData) return;

        const updatedTasks = [...formData.tasks];
        const updatedEnvVars = [...updatedTasks[taskIndex].envVars];

        if (updatedEnvVars.length <= 1) {
            updatedEnvVars[0] = { key: '', value: '' };
        } else {
            updatedEnvVars.splice(varIndex, 1);
        }

        updatedTasks[taskIndex] = {
            ...updatedTasks[taskIndex],
            envVars: updatedEnvVars
        };

        setFormData({
            ...formData,
            tasks: updatedTasks
        });
    };

    // Handle port changes
    const handlePortChange = (index: number, field: keyof NomadPort, value: string) => {
        if (!formData) return;

        const updatedPorts = [...formData.ports];

        if (field === 'static') {
            updatedPorts[index] = {
                ...updatedPorts[index],
                [field]: value === 'true'
            };
        } else if (field === 'label') {
            updatedPorts[index] = {
                ...updatedPorts[index],
                [field]: value
            };
        } else {
            updatedPorts[index] = {
                ...updatedPorts[index],
                [field]: parseInt(value, 10) || 0
            };
        }

        setFormData({
            ...formData,
            ports: updatedPorts
        });
    };

    // Add a new port field
    const addPort = () => {
        if (!formData) return;

        setFormData({
            ...formData,
            ports: [...formData.ports, { label: '', value: 0, to: 0, static: false }]
        });
    };

    // Remove a port field
    const removePort = (index: number) => {
        if (!formData || formData.ports.length <= 1) return;

        const updatedPorts = [...formData.ports];
        updatedPorts.splice(index, 1);

        setFormData({
            ...formData,
            ports: updatedPorts
        });
    };

    // Handle health check changes
    const handleHealthCheckChange = (field: keyof NomadHealthCheck, value: string | number) => {
        if (!formData) return;

        const updatedHealthChecks = [...formData.healthChecks];

        if (field === 'type') {
            updatedHealthChecks[0] = {
                ...updatedHealthChecks[0],
                [field]: value as 'http' | 'tcp' | 'script'
            };
        } else {
            updatedHealthChecks[0] = {
                ...updatedHealthChecks[0],
                [field]: typeof value === 'string' ? value : parseInt(String(value), 10) || 0
            };
        }

        setFormData({
            ...formData,
            healthChecks: updatedHealthChecks
        });
    };

    // Submit form to update job
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsSaving(true);

        try {
            if (!token || !nomadAddr || !formData || !initialJob) {
                throw new Error('Authentication required or form data missing');
            }

            // Validate tasks
            for (let i = 0; i < formData.tasks.length; i++) {
                const task = formData.tasks[i];

                if (!task.name.trim()) {
                    throw new Error(`Task ${i + 1} name is required`);
                }

                if (!task.image.trim()) {
                    throw new Error(`Task ${i + 1} image is required`);
                }

                if (task.usePrivateRegistry) {
                    if (!task.dockerAuth?.username) {
                        throw new Error(`Username is required for private registry in task ${i + 1}`);
                    }
                    if (!task.dockerAuth?.password) {
                        throw new Error(`Password is required for private registry in task ${i + 1}`);
                    }
                }
            }

            // Create updated job spec from form data and original job
            const jobSpec = updateJobSpec(initialJob, formData);
            console.log('Updated job spec:', JSON.stringify(jobSpec, null, 2));

            // Submit job to Nomad
            const client = createNomadClient(nomadAddr, token);
            const response = await client.updateJob(jobSpec);

            setSuccess(`Job "${formData.name}" updated successfully!`);

            // Navigate back to job details after successful update
            setTimeout(() => {
                router.push(`/jobs/${jobId}?namespace=${namespace}`);
            }, 2000);
        } catch (err) {
            console.error('Failed to update job:', err);
            setError(typeof err === 'object' && err !== null && 'message' in err
                ? (err as Error).message
                : 'Failed to update job. Please check your inputs and try again.');
            addToast('Failed to update job', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePortTaskChange = (portIndex: number, taskName: string) => {
        if (!formData) return;

        const updatedPorts = [...formData.ports];
        updatedPorts[portIndex] = {
            ...updatedPorts[portIndex],
            taskName: taskName || undefined
        };

        setFormData({
            ...formData,
            ports: updatedPorts
        });
    };

    return {
        formData,
        initialJob,
        isLoading,
        isSaving,
        isLoadingNamespaces,
        error,
        success,
        namespaces,
        handleInputChange,
        handleTaskInputChange,
        handleSelectChange,
        handleCheckboxChange,
        handleTaskCheckboxChange,
        handleEnvVarChange,
        addEnvVar,
        removeEnvVar,
        handlePortChange,
        handlePortTaskChange,
        addPort,
        removePort,
        handleHealthCheckChange,
        addTask,
        removeTask,
        handleSubmit
    };
}
