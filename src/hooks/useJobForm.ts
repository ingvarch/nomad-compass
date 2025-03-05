// src/hooks/useJobForm.ts
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import { NomadJobFormData, NomadPort, NomadHealthCheck, NomadEnvVar, TaskFormData } from '@/types/nomad';
import { createJobSpec } from '@/lib/services/jobSpecService';
import { validateJobName } from '@/lib/services/validationService';

// Default task configuration
export const defaultTaskData: TaskFormData = {
    name: '',
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
    }
};

export const defaultFormValues: NomadJobFormData = {
    name: '',
    namespace: 'default',
    tasks: [{ ...defaultTaskData }], // Start with one task
    ports: [{ label: 'http', value: 8080, to: 8080, static: false }],
    enablePorts: false,
    networkMode: 'none',
    serviceProvider: 'nomad',
    healthChecks: [{
        type: 'http',
        path: '/health',
        interval: 30,
        timeout: 5,
        initialDelay: 5,
        failuresBeforeUnhealthy: 3,
        successesBeforeHealthy: 2
    }],
    enableHealthCheck: false,
    count: 1,
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

    // Handle form input changes
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

    // Handle task-specific input changes
    const handleTaskInputChange = (taskIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    // Toggle checkbox
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;

        // If we disable network settings, show a warning or prevent it since it will break service discovery
        if (name === 'enablePorts' && !checked) {
            if (formData.tasks.length > 1) {
                // Show confirmation dialog if there are multiple tasks
                const confirm = window.confirm(
                    "Disabling network ports will prevent containers from communicating via service discovery. Are you sure you want to continue?"
                );
                if (!confirm) {
                    return; // Don't change the setting if user cancels
                }
            }
        }

        // If we enable network settings, set the service provider to 'nomad' by default
        if (name === 'enablePorts' && checked) {
            setFormData({
                ...formData,
                [name]: checked,
                serviceProvider: 'nomad',
                networkMode: 'bridge' // Default to bridge for better service discovery
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
        const newTask: TaskFormData = {
            ...defaultTaskData,
            name: `${formData.name ? formData.name + '-' : ''}task-${formData.tasks.length + 1}`
        };

        setFormData({
            ...formData,
            tasks: [...formData.tasks, newTask]
        });

        // If adding a task and network is not enabled, automatically enable it
        if (!formData.enablePorts) {
            setFormData(prev => ({
                ...prev,
                tasks: [...prev.tasks, newTask],
                enablePorts: true,
                networkMode: 'bridge'
            }));
        } else {
            setFormData({
                ...formData,
                tasks: [...formData.tasks, newTask]
            });
        }
    };

    // Remove a task from the form
    const removeTask = (taskIndex: number) => {
        if (formData.tasks.length <= 1) {
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
        setFormData({
            ...formData,
            ports: [...formData.ports, { label: '', value: 0, to: 0, static: false }]
        });
    };

    // Remove a port field
    const removePort = (index: number) => {
        if (formData.ports.length <= 1) return;

        const updatedPorts = [...formData.ports];
        updatedPorts.splice(index, 1);

        setFormData({
            ...formData,
            ports: updatedPorts
        });
    };

    // Handle health check changes
    const handleHealthCheckChange = (field: keyof NomadHealthCheck, value: string | number) => {
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

            // If we have multiple tasks, make sure networking is enabled
            if (formData.tasks.length > 1 && !formData.enablePorts) {
                throw new Error('Network configuration must be enabled when using multiple containers');
            }

            // If network is enabled but mode is "none", show warning for service discovery
            if (formData.tasks.length > 1 && formData.enablePorts && formData.networkMode === 'none') {
                const confirm = window.confirm(
                    "Using 'none' network mode will prevent containers from communicating using service discovery. It's recommended to use 'bridge' mode for multi-container deployments. Continue anyway?"
                );
                if (!confirm) {
                    setIsLoading(false);
                    return;
                }
            }

            // Create job spec from form data
            const jobSpec = createJobSpec(formData);
            console.log('Job spec:', JSON.stringify(jobSpec, null, 2));

            // Submit job to Nomad
            const client = createNomadClient(nomadAddr, token);
            const response = await client.createJob(jobSpec);

            setSuccess(`Job "${formData.name}" created successfully in namespace "${formData.namespace}"!`);

            // Reset form after successful submission
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
        isLoading,
        isLoadingNamespaces,
        isNameValid,
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
