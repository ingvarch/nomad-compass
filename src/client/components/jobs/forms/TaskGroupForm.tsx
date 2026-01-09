import React from 'react';
import { useJobFormContext } from '../../../context/JobFormContext';
import { useTaskGroupHandlers } from '../../../hooks/useTaskGroupHandlers';
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
  isFirst: boolean;
  jobName: string;
}

/**
 * TaskGroupForm - Form for a single task group.
 * Uses useTaskGroupHandlers for all handlers, eliminating props drilling.
 */
export const TaskGroupForm: React.FC<TaskGroupFormProps> = ({
  groupIndex,
  isFirst,
  jobName,
}) => {
  const { state } = useJobFormContext();
  const { isLoading, isSaving } = state;
  const loading = isLoading || isSaving;

  const {
    group,
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
  } = useTaskGroupHandlers(groupIndex);

  if (!group) return null;

  return (
    <ToggleableSection
      title={group.name || `Group ${groupIndex + 1}`}
      isPrimary={isFirst}
      isRemovable={!isFirst}
      onRemove={onRemoveGroup}
      isLoading={loading}
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
        placeholder={isFirst ? jobName || 'main' : `${jobName}-group-${groupIndex + 1}`}
        disabled={loading}
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
        disabled={loading}
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
        disabled={loading}
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
        disabled={loading}
      />

      {/* Private Registry Credentials */}
      {group.usePrivateRegistry && (
        <PrivateRegistryForm
          dockerAuth={group.dockerAuth}
          onInputChange={onInputChange}
          isLoading={loading}
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
        disabled={loading}
        className="mt-6"
        options={[
          { value: 'podman', label: 'Podman' },
          { value: 'docker', label: 'Docker' },
        ]}
      />

      {/* Resources */}
      <ResourcesForm
        resources={group.resources}
        onInputChange={onInputChange}
        isLoading={loading}
        groupIndex={groupIndex}
      />

      {/* Environment Variables */}
      <EnvVarsSection
        envVars={group.envVars}
        onEnvVarChange={onEnvVarChange}
        onAddEnvVar={onAddEnvVar}
        onRemoveEnvVar={onRemoveEnvVar}
        isLoading={loading}
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
        isLoading={loading}
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
        isLoading={loading}
        groupIndex={groupIndex}
      />

      {/* Health Check Configuration */}
      <HealthCheckSection
        enableHealthCheck={group.enableHealthCheck}
        healthCheck={group.healthCheck}
        onCheckboxChange={onCheckboxChange}
        onHealthCheckChange={onHealthCheckChange}
        isLoading={loading}
        groupIndex={groupIndex}
      />

      {/* Nomad Environment Variables Information */}
      <NomadEnvironmentInfo />
    </ToggleableSection>
  );
};

export default TaskGroupForm;
