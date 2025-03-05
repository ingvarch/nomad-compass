// src/hooks/useJobEditForm.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import { NomadJobFormData, TaskGroupFormData, NomadPort, NomadHealthCheck, NomadEnvVar, NomadJob } from '@/types/nomad';
import { updateJobSpec, convertJobToFormData } from '@/lib/services/jobSpecService';
import { useToast } from '@/context/ToastContext';
import { defaultTaskGroupData } from '@/hooks/useJobForm';

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

    // Handle task group-specific input changes
    const handleGroupInputChange = (groupIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!formData) return;

        const { name, value, type } = e.target;
        const newValue = type === 'number' ? Number(value) : value;

        const updatedGroups = [...formData.taskGroups];

        // Parse the property path (e.g., "resources.CPU")
        const parts = name.split('.');

        if (parts.length === 1) {
            // Simple property
            updatedGroups[groupIndex] = {
                ...updatedGroups[groupIndex],
                [name]: newValue
            };
        } else if (parts.length === 2 && parts[0] === 'resources') {
            // Resource property (CPU, MemoryMB, DiskMB)
            const resourceField = parts[1];
            updatedGroups[groupIndex] = {
                ...updatedGroups[groupIndex],
                resources: {
                    ...updatedGroups[groupIndex].resources,
                    [resourceField]: parseInt(value, 10)
                }
            };
        } else if (parts.length === 2 && parts[0] === 'dockerAuth') {
            // Docker auth property
            const authField = parts[1];
            updatedGroups[groupIndex] = {
                ...updatedGroups[groupIndex],
                dockerAuth: {
                    ...updatedGroups[groupIndex].dockerAuth!,
                    [authField]: value
                }
            };
        } else if (parts.length === 2 && parts[0] === 'healthCheck') {
            // Health check property
            const healthCheckField = parts[1];
            updatedGroups[groupIndex] = {
                ...updatedGroups[groupIndex],
                healthCheck: {
                    ...updatedGroups[groupIndex].healthCheck!,
                    [healthCheckField]: type === 'number' ? parseInt(value, 10) : value
                }
            };
        }

        setFormData({
            ...formData,
            taskGroups: updatedGroups
        });
    };

    const handleSelectChange = (groupIndex: number, e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!formData) return;

        const { name, value } = e.target;
        const updatedGroups = [...formData.taskGroups];

        updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            [name]: value
        };

        setFormData({
            ...formData,
            taskGroups: updatedGroups
        });
    };

    // Toggle checkbox for a task group
    const handleGroupCheckboxChange = (groupIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!formData) return;

        const { name, checked } = e.target;
        const updatedGroups = [...formData.taskGroups];

        updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            [name]: checked
        };

        setFormData({
            ...formData,
            taskGroups: updatedGroups
        });
    };

    // Add a new task group to the form
    const addTaskGroup = () => {
        if (!formData) return;

        const newGroup: TaskGroupFormData = {
            ...defaultTaskGroupData,
            name: `${formData.name ? formData.name + '-' : ''}group-${formData.taskGroups.length + 1}`
        };

        setFormData({
            ...formData,
            taskGroups: [...formData.taskGroups, newGroup]
        });
    };

    // Remove a task group from the form
    const removeTaskGroup = (groupIndex: number) => {
        if (!formData || formData.taskGroups.length <= 1) {
            // Don't remove the last task group
            return;
        }

        const updatedGroups = [...formData.taskGroups];
        updatedGroups.splice(groupIndex, 1);

        setFormData({
            ...formData,
            taskGroups: updatedGroups
        });
    };

    // Handle environment variable changes for a specific task group
    const handleEnvVarChange = (groupIndex: number, varIndex: number, field: 'key' | 'value', value: string) => {
        if (!formData) return;

        const updatedGroups = [...formData.taskGroups];
        const updatedEnvVars = [...updatedGroups[groupIndex].envVars];

        updatedEnvVars[varIndex] = {
            ...updatedEnvVars[varIndex],
            [field]: value
        };

        updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            envVars: updatedEnvVars
        };

        setFormData({
            ...formData,
            taskGroups: updatedGroups
        });
    };

    // Add a new environment variable field to a specific task group
    const addEnvVar = (groupIndex: number) => {
        if (!formData) return;

        const updatedGroups = [...formData.taskGroups];
        updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            envVars: [...updatedGroups[groupIndex].envVars, { key: '', value: '' }]
        };

        setFormData({
            ...formData,
            taskGroups: updatedGroups
        });
    };

    // Remove an environment variable field from a specific task group
    const removeEnvVar = (groupIndex: number, varIndex: number) => {
        if (!formData) return;

        const updatedGroups = [...formData.taskGroups];
        const updatedEnvVars = [...updatedGroups[groupIndex].envVars];

        if (updatedEnvVars.length <= 1) {
            updatedEnvVars[0] = { key: '', value: '' };
        } else {
            updatedEnvVars.splice(varIndex, 1);
        }

        updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            envVars: updatedEnvVars
        };

        setFormData({
            ...formData,
            taskGroups: updatedGroups
        });
    };

    // Handle port changes
    const handlePortChange = (groupIndex: number, portIndex: number, field: keyof NomadPort, value: string) => {
        if (!formData) return;

        const updatedGroups = [...formData.taskGroups];
        const updatedPorts = [...updatedGroups[groupIndex].ports];

        if (field === 'static') {
            const isStatic = value === 'true';
            updatedPorts[portIndex] = {
                ...updatedPorts[portIndex],
                [field]: isStatic
            };

            // If toggling from dynamic to static, set a default value
            if (isStatic && !updatedPorts[portIndex].value) {
                updatedPorts[portIndex].value = 8080 + portIndex;
            }
        } else if (field === 'label') {
            updatedPorts[portIndex] = {
                ...updatedPorts[portIndex],
                [field]: value
            };
        } else {
            updatedPorts[portIndex] = {
                ...updatedPorts[portIndex],
                [field]: parseInt(value, 10) || 0
            };
        }

        updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            ports: updatedPorts
        };

        setFormData({
            ...formData,
            taskGroups: updatedGroups
        });
    };

    // Add a new port field
    const addPort = (groupIndex: number) => {
        if (!formData) return;

        const updatedGroups = [...formData.taskGroups];
        updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            ports: [...updatedGroups[groupIndex].ports, { label: '', value: 0, to: 8080, static: false }]
        };

        setFormData({
            ...formData,
            taskGroups: updatedGroups
        });
    };

    // Remove a port field
    const removePort = (groupIndex: number, portIndex: number) => {
        if (!formData) return;

        const updatedGroups = [...formData.taskGroups];

        if (updatedGroups[groupIndex].ports.length <= 1) return;

        const updatedPorts = [...updatedGroups[groupIndex].ports];
        updatedPorts.splice(portIndex, 1);

        updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            ports: updatedPorts
        };

        setFormData({
            ...formData,
            taskGroups: updatedGroups
        });
    };

    // Handle health check changes
    const handleHealthCheckChange = (groupIndex: number, field: keyof NomadHealthCheck, value: string | number) => {
        if (!formData) return;

        const updatedGroups = [...formData.taskGroups];

        if (!updatedGroups[groupIndex].healthCheck) {
            updatedGroups[groupIndex].healthCheck = { ...defaultTaskGroupData.healthCheck! };
        }

        if (field === 'type') {
            updatedGroups[groupIndex] = {
                ...updatedGroups[groupIndex],
                healthCheck: {
                    ...updatedGroups[groupIndex].healthCheck!,
                    [field]: value as 'http' | 'tcp' | 'script'
                }
            };
        } else {
            updatedGroups[groupIndex] = {
                ...updatedGroups[groupIndex],
                healthCheck: {
                    ...updatedGroups[groupIndex].healthCheck!,
                    [field]: typeof value === 'string' ? value : parseInt(String(value), 10) || 0
                }
            };
        }

        setFormData({
            ...formData,
            taskGroups: updatedGroups
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

            // Validate task groups
            for (let i = 0; i < formData.taskGroups.length; i++) {
                const group = formData.taskGroups[i];

                if (!group.name.trim()) {
                    throw new Error(`Group ${i + 1} name is required`);
                }

                if (!group.image.trim()) {
                    throw new Error(`Image for group ${i + 1} is required`);
                }

                if (group.usePrivateRegistry) {
                    if (!group.dockerAuth?.username) {
                        throw new Error(`Username is required for private registry in group ${i + 1}`);
                    }
                    if (!group.dockerAuth?.password) {
                        throw new Error(`Password is required for private registry in group ${i + 1}`);
                    }
                }

                // Validate ports if networking is enabled
                if (group.enableNetwork && group.ports.length > 0) {
                    for (let j = 0; j < group.ports.length; j++) {
                        const port = group.ports[j];
                        if (!port.label) {
                            throw new Error(`Port label is required for port ${j + 1} in group ${i + 1}`);
                        }
                        if (port.static && (!port.value || port.value <= 0 || port.value > 65535)) {
                            throw new Error(`Valid port value (1-65535) is required for static port ${j + 1} in group ${i + 1}`);
                        }
                    }
                }
            }

            // Create updated job spec from form data and original job
            const jobSpec = updateJobSpec(initialJob, formData);
            console.log('Updated job spec:', JSON.stringify(jobSpec, null, 2));

            // Submit job to Nomad
            const client = createNomadClient(nomadAddr, token);
            await client.updateJob(jobSpec);

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
        handleSubmit
    };
}
