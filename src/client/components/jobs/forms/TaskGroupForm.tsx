// src/components/jobs/forms/TaskGroupForm.tsx
import React from 'react';
import { NomadEnvVar, NomadPort, NomadHealthCheck, NomadServiceConfig, IngressConfig } from '../../../types/nomad';
import FormInputField from '../../ui/forms/FormInputField';
import ToggleableSection from '../../ui/forms/ToggleableSection';
import PrivateRegistryForm from './parts/PrivateRegistryForm';
import ResourcesForm from './parts/ResourcesForm';
import EnvVarsSection from './parts/EnvVarsSection';
import NetworkSection from './parts/NetworkSection';
import ServiceSection from './parts/ServiceSection';
import HealthCheckSection from './parts/HealthCheckSection';
import NomadEnvironmentInfo from './parts/NomadEnvironmentInfo';

interface TaskGroupFormProps {
    groupIndex: number;
    group: {
        name: string;
        count: number;
        image: string;
        plugin: string;
        resources: {
            CPU: number;
            MemoryMB: number;
            DiskMB: number;
        };
        envVars: NomadEnvVar[];
        usePrivateRegistry: boolean;
        dockerAuth?: {
            username: string;
            password: string;
        };
        enableNetwork: boolean;
        networkMode: 'none' | 'host' | 'bridge';
        ports: NomadPort[];
        enableHealthCheck: boolean;
        healthCheck?: NomadHealthCheck;
        enableService: boolean;
        serviceConfig?: NomadServiceConfig;
    };
    isFirst: boolean;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onEnvVarChange: (varIndex: number, field: 'key' | 'value', value: string) => void;
    onAddEnvVar: () => void;
    onRemoveEnvVar: (varIndex: number) => void;
    onPortChange: (portIndex: number, field: keyof NomadPort, value: string) => void;
    onAddPort: () => void;
    onRemovePort: (portIndex: number) => void;
    onHealthCheckChange: (field: keyof NomadHealthCheck, value: string | number) => void;
    // Network Configuration handler
    onEnableNetworkChange: (enabled: boolean) => void;
    // Service Discovery & Ingress handlers
    onEnableServiceChange: (enabled: boolean) => void;
    onServiceConfigChange: (config: Partial<NomadServiceConfig>) => void;
    onIngressChange: (field: keyof IngressConfig, value: string | boolean) => void;
    onTagChange: (tagIndex: number, field: 'key' | 'value', value: string) => void;
    onAddTag: () => void;
    onRemoveTag: (tagIndex: number) => void;
    onRemoveGroup: () => void;
    jobName: string;
    namespace: string;
    isLoading: boolean;
}

export const TaskGroupForm: React.FC<TaskGroupFormProps> = ({
    groupIndex,
    group,
    isFirst,
    onInputChange,
    onCheckboxChange,
    onEnvVarChange,
    onAddEnvVar,
    onRemoveEnvVar,
    onPortChange,
    onAddPort,
    onRemovePort,
    onHealthCheckChange,
    onEnableNetworkChange,
    onEnableServiceChange,
    onServiceConfigChange,
    onIngressChange,
    onTagChange,
    onAddTag,
    onRemoveTag,
    onRemoveGroup,
    jobName,
    namespace,
    isLoading
}) => {
    return (
        <ToggleableSection 
            title={group.name || `Group ${groupIndex + 1}`}
            isPrimary={isFirst}
            isRemovable={!isFirst}
            onRemove={onRemoveGroup}
            isLoading={isLoading}
            defaultExpanded={true}
        >
            {/* Group Name */}
            <FormInputField
                id={`group-${groupIndex}-name`}
                name="name"
                label="Group Name"
                type="text"
                value={group.name}
                onChange={onInputChange}
                placeholder={isFirst ? jobName || "main" : `${jobName}-group-${groupIndex + 1}`}
                disabled={isLoading}
                required
                helpText="A unique name for this task group. This name will be used for service discovery."
            />

            {/* Group Count (Replicas) */}
            <FormInputField
                id={`group-${groupIndex}-count`}
                name="count"
                label="Count (Replicas)"
                type="number"
                value={group.count}
                onChange={onInputChange}
                min={1}
                disabled={isLoading}
                helpText="Number of instances to run of this task group"
            />

            {/* Docker Image */}
            <FormInputField
                id={`group-${groupIndex}-image`}
                name="image"
                label="Docker Image"
                type="text"
                value={group.image}
                onChange={onInputChange}
                placeholder="nginx:latest"
                disabled={isLoading}
                required
            />

            {/* Private Registry Checkbox */}
            <FormInputField
                id={`group-${groupIndex}-usePrivateRegistry`}
                name="usePrivateRegistry"
                label="Use Private Container Registry"
                type="checkbox"
                value={group.usePrivateRegistry}
                onChange={onCheckboxChange}
                disabled={isLoading}
            />

            {/* Private Registry Credentials */}
            {group.usePrivateRegistry && (
                <PrivateRegistryForm
                    dockerAuth={group.dockerAuth}
                    onInputChange={onInputChange}
                    isLoading={isLoading}
                    groupIndex={groupIndex}
                />
            )}

            {/* Container Runtime */}
            <FormInputField
                id={`group-${groupIndex}-plugin`}
                name="plugin"
                label="Container Runtime"
                type="select"
                value={group.plugin}
                onChange={onInputChange}
                disabled={isLoading}
                className="mt-6"
                options={[
                    { value: 'podman', label: 'Podman' },
                    { value: 'docker', label: 'Docker' }
                ]}
            />

            {/* Resources */}
            <ResourcesForm
                resources={group.resources}
                onInputChange={onInputChange}
                isLoading={isLoading}
                groupIndex={groupIndex}
            />

            {/* Environment Variables */}
            <EnvVarsSection
                envVars={group.envVars}
                onEnvVarChange={onEnvVarChange}
                onAddEnvVar={onAddEnvVar}
                onRemoveEnvVar={onRemoveEnvVar}
                isLoading={isLoading}
            />

            {/* Network Configuration */}
            <NetworkSection
                enableNetwork={group.enableNetwork}
                networkMode={group.networkMode}
                ports={group.ports}
                onInputChange={onInputChange}
                onEnableNetworkChange={onEnableNetworkChange}
                onPortChange={onPortChange}
                onAddPort={onAddPort}
                onRemovePort={onRemovePort}
                isLoading={isLoading}
                groupIndex={groupIndex}
            />

            {/* Service Discovery & Ingress Configuration */}
            <ServiceSection
                enableService={group.enableService}
                serviceConfig={group.serviceConfig}
                ports={group.ports}
                groupName={group.name || jobName}
                onEnableServiceChange={onEnableServiceChange}
                onServiceConfigChange={onServiceConfigChange}
                onIngressChange={onIngressChange}
                onTagChange={onTagChange}
                onAddTag={onAddTag}
                onRemoveTag={onRemoveTag}
                isLoading={isLoading}
                groupIndex={groupIndex}
            />

            {/* Health Check Configuration */}
            <HealthCheckSection
                enableHealthCheck={group.enableHealthCheck}
                healthCheck={group.healthCheck}
                onCheckboxChange={onCheckboxChange}
                onHealthCheckChange={onHealthCheckChange}
                isLoading={isLoading}
                groupIndex={groupIndex}
            />

            {/* Nomad Environment Variables Information */}
            <NomadEnvironmentInfo />
        </ToggleableSection>
    );
};

export default TaskGroupForm;
