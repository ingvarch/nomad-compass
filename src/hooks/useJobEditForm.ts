// src/hooks/useJobEditForm.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import { NomadJobFormData, NomadPort, NomadHealthCheck, NomadEnvVar, NomadJob } from '@/types/nomad';
import { updateJobSpec } from '@/lib/services/jobSpecService';
import { useToast } from '@/context/ToastContext';

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
    // Convert Nomad job data to form data structure
    const convertJobToFormData = (job: NomadJob): NomadJobFormData => {
        if (!job || !job.TaskGroups || job.TaskGroups.length === 0 || !job.TaskGroups[0].Tasks || job.TaskGroups[0].Tasks.length === 0) {
            throw new Error("Invalid job data structure");
        }

        const taskGroup = job.TaskGroups[0];
        const task = taskGroup.Tasks[0];
        const config = task.Config || {};

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
                        static: false
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
                        static: true
                    }))
                ];
            }
        }

        // If no ports found, add a default one
        if (ports.length === 0) {
            ports = [{ label: 'http', value: 8080, to: 8080, static: false }];
        }

        // Extract health checks
        const service = taskGroup.Services && taskGroup.Services.length > 0 ? taskGroup.Services[0] : null;
        const healthCheck = service && service.Checks && service.Checks.length > 0 ? service.Checks[0] : null;

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

        // Extract environment variables
        const envVars: NomadEnvVar[] = task.Env ?
            Object.entries(task.Env).map(([key, value]) => ({ key, value: value as string })) :
            [{ key: '', value: '' }];

        // Extract Docker auth if present
        const usePrivateRegistry = !!(config.auth && config.auth.username && config.auth.password);

        // Build form data
        return {
            name: job.Name,
            image: config.image || '',
            plugin: task.Driver || 'podman',
            namespace: job.Namespace || 'default',
            resources: {
                CPU: task.Resources?.CPU || 100,
                MemoryMB: task.Resources?.MemoryMB || 256,
                DiskMB: task.Resources?.DiskMB || 500,
            },
            envVars: envVars.length > 0 ? envVars : [{ key: '', value: '' }],
            ports,
            enablePorts,
            networkMode,
            healthChecks: [healthCheckData],
            enableHealthCheck: !!healthCheck,
            count: taskGroup.Count || 1,
            datacenters: job.Datacenters || ['dc1'],
            usePrivateRegistry,
            dockerAuth: usePrivateRegistry ? {
                username: config.auth.username,
                password: config.auth.password
            } : {
                username: '',
                password: ''
            }
        };
    };

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!formData) return;

        const { name, value, type } = e.target;
        const newValue = type === 'number' ? Number(value) : value;

        if (name.startsWith('resources.')) {
            const resourceField = name.split('.')[1];
            setFormData({
                ...formData,
                resources: {
                    ...formData.resources,
                    [resourceField]: parseInt(value, 10)
                }
            });
        } else if (name === 'datacenters') {
            // Split comma-separated datacenters into an array
            setFormData({
                ...formData,
                datacenters: value.split(',').map(dc => dc.trim())
            });
        } else if (name.startsWith('dockerAuth.')) {
            const field = name.split('.')[1];
            setFormData({
                ...formData,
                dockerAuth: {
                    ...formData.dockerAuth!,
                    [field]: value
                }
            });
        } else {
            setFormData({
                ...formData,
                [name]: newValue
            });
        }
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
        setFormData({
            ...formData,
            [name]: checked
        });
    };

    // Handle environment variable changes
    const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
        if (!formData) return;

        const updatedEnvVars = [...formData.envVars];
        updatedEnvVars[index] = {
            ...updatedEnvVars[index],
            [field]: value
        };

        setFormData({
            ...formData,
            envVars: updatedEnvVars
        });
    };

    // Add a new environment variable field
    const addEnvVar = () => {
        if (!formData) return;

        setFormData({
            ...formData,
            envVars: [...formData.envVars, { key: '', value: '' }]
        });
    };

    // Remove an environment variable field
    const removeEnvVar = (index: number) => {
        if (!formData) return;

        if (formData.envVars.length <= 1) {
            const updatedEnvVars = [...formData.envVars];
            updatedEnvVars[0] = { key: '', value: '' };

            setFormData({
                ...formData,
                envVars: updatedEnvVars
            });
            return;
        }

        const updatedEnvVars = [...formData.envVars];
        updatedEnvVars.splice(index, 1);

        setFormData({
            ...formData,
            envVars: updatedEnvVars
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

            // Validate form data
            if (!formData.image.trim()) {
                throw new Error('Docker image is required');
            }

            if (formData.usePrivateRegistry) {
                if (!formData.dockerAuth?.username) {
                    throw new Error('Username is required for private registry');
                }
                if (!formData.dockerAuth?.password) {
                    throw new Error('Password is required for private registry');
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
        handleSelectChange,
        handleCheckboxChange,
        handleEnvVarChange,
        addEnvVar,
        removeEnvVar,
        handlePortChange,
        addPort,
        removePort,
        handleHealthCheckChange,
        handleSubmit
    };
}
