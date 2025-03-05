// src/hooks/useJobForm.ts
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import { NomadJobFormData, TaskGroupFormData, NomadPort, NomadHealthCheck, NomadEnvVar } from '@/types/nomad';
import { createJobSpec } from '@/lib/services/jobSpecService';
import { validateJobName } from '@/lib/services/validationService';

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
    envVars: [{ key: '', value: '' }],
    usePrivateRegistry: false,
    dockerAuth: {
        username: '',
        password: ''
    },
    enableNetwork: false,
    networkMode: 'bridge',
    ports: [{ label: 'http', value: 8080, to: 8080, static: false }],
    enableHealthCheck: false,
    healthCheck: {
        type: 'http',
        path: '/health',
        interval: 30,
        timeout: 5,
        initialDelay: 5,
        failuresBeforeUnhealthy: 3,
        successesBeforeHealthy: 2
    }
};

export const defaultFormValues: NomadJobFormData = {
    name: '',
    namespace: 'default',
    taskGroups: [{ ...defaultTaskGroupData }], // Start with one task group
    serviceProvider: 'nomad',
    datacenters: ['dc1'],
};

export function useJobForm() {
    const router = useRouter();
    const { token, nomadAddr } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [namespaces, setNamespaces] = useState<string[]>(['default']);
    const [isLoadingNamespaces, setIsLoadingNamespaces] = useState(true);
    const [isNameValid, setIsNameValid] = useState(true);
    const [formData, setFormData] = useState<NomadJobFormData>(defaultFormValues);

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

    // Handle job-level form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const newValue = type === 'number' ? Number(value) : value;

        // Validate job name if that's what changed
        if (name === 'name') {
            setIsNameValid(validateJobName(value));
        }

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
        if (formData.taskGroups.length <= 1) {
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

    // Submit form to create job
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        try {
            if (!token || !nomadAddr) {
                throw new Error('Authentication required');
            }

            // Validate form data
            if (!formData.name.trim()) {
                throw new Error('Job name is required');
            }

            // Validate job name format
            if (!validateJobName(formData.name)) {
                setIsNameValid(false);
                throw new Error('Job name must start with a letter or number and contain only letters, numbers, hyphens, underscores, and dots');
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

            // Create job spec from form data
            const jobSpec = createJobSpec(formData);
            console.log('Job spec:', JSON.stringify(jobSpec, null, 2));

            // Submit job to Nomad
            const client = createNomadClient(nomadAddr, token);
            await client.createJob(jobSpec);

            setSuccess(`Job "${formData.name}" created successfully in namespace "${formData.namespace}"!`);

            // Redirect after successful submission
            setTimeout(() => {
                router.push('/jobs');
            }, 2000);
        } catch (err) {
            console.error('Failed to create job:', err);
            setError(typeof err === 'object' && err !== null && 'message' in err
                ? (err as Error).message
                : 'Failed to create job. Please check your inputs and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        formData,
        isLoading,
        isLoadingNamespaces,
        isNameValid,
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
