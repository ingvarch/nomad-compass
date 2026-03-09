import React from 'react';
import { useJobFormContext, jobFormActions, defaultTaskData } from '../../../context/JobFormContext';
import { useTaskGroupHandlers } from '../../../hooks/useTaskGroupHandlers';
import FormInputField from '../../ui/forms/FormInputField';
import ToggleableSection from '../../ui/forms/ToggleableSection';
import TaskForm from './TaskForm';
import NetworkSection from './parts/NetworkSection';
import ServiceSection from './parts/ServiceSection';
import HealthCheckSection from './parts/HealthCheckSection';

interface TaskGroupFormProps {
  groupIndex: number;
  isFirst: boolean;
  jobName: string;
}

/**
 * TaskGroupForm - Form for a single task group.
 * Uses useTaskGroupHandlers for group-level handlers.
 * Task-level fields are delegated to TaskForm components.
 */
const TaskGroupForm: React.FC<TaskGroupFormProps> = ({
  groupIndex,
  isFirst,
  jobName,
}) => {
  const { state, dispatch } = useJobFormContext();
  const { isLoading, isSaving } = state;
  const loading = isLoading || isSaving;

  const {
    group,
    onInputChange,
    onCheckboxChange,
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

  const handleAddTask = () => {
    const taskName = `${group.name || 'task'}-${group.tasks.length + 1}`;
    dispatch(jobFormActions.addTask(groupIndex, { ...defaultTaskData, name: taskName }));
  };

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

      {/* Tasks */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h5 className="text-md font-medium text-gray-700 dark:text-gray-300">Tasks</h5>
          <button
            type="button"
            onClick={handleAddTask}
            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
          >
            Add Task
          </button>
        </div>
        <div className="space-y-4">
          {group.tasks.map((_, taskIndex) => (
            <TaskForm
              key={taskIndex}
              groupIndex={groupIndex}
              taskIndex={taskIndex}
              isOnly={group.tasks.length === 1}
            />
          ))}
        </div>
      </div>

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
    </ToggleableSection>
  );
};

export default TaskGroupForm;
