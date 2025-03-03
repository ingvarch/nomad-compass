// src/hooks/useJobForm.ts
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import { NomadJobFormData, NomadPort, NomadHealthCheck, NomadEnvVar } from '@/types/nomad';
import { createJobSpec } from '@/lib/services/jobSpecService';
import { validateJobName } from '@/lib/services/validationService';

export const defaultFormValues: NomadJobFormData = {
    name: '',
    image: '',
    plugin: 'podman',
    namespace: 'default',
    resources: {
        CPU: 100,
        MemoryMB: 256,
        DiskMB: 500,
    },
    envVars: [{ key: '', value: '' }],
    ports: [{ label: 'http', value: 8080, to: 8080, static: false }],
    enablePorts: false,
    networkMode: 'none',
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
    usePrivateRegistry: false,
    dockerAuth: {
        username: '',
        password: ''
    }
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
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    // Toggle checkbox
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData({
            ...formData,
            [name]: checked
        });
    };

    // Handle environment variable changes
    const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
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
        setFormData({
            ...formData,
            envVars: [...formData.envVars, { key: '', value: '' }]
        });
    };

    // Remove an environment variable field
    const removeEnvVar = (index: number) => {
        if (formData.envVars.length <= 1) return;

        const updatedEnvVars = [...formData.envVars];
        updatedEnvVars.splice(index, 1);

        setFormData({
            ...formData,
            envVars: updatedEnvVars
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

    return {
        formData,
        isLoading,
        isLoadingNamespaces,
        isNameValid,
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
