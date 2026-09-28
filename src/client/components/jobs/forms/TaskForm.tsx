import React from 'react';
import { useJobFormContext } from '../../../context/JobFormContext';
import { useTaskHandlers } from '../../../hooks/useTaskHandlers';
import FormInputField from '../../ui/forms/FormInputField';
import ToggleableSection from '../../ui/forms/ToggleableSection';
import StringListEditor from '../../ui/forms/StringListEditor';
import PrivateRegistryForm from './parts/PrivateRegistryForm';
import ResourcesForm from './parts/ResourcesForm';
import EnvVarsSection from './parts/EnvVarsSection';
import NomadEnvironmentInfo from './parts/NomadEnvironmentInfo';

interface TaskFormProps {
  groupIndex: number;
  taskIndex: number;
  isOnly: boolean;
}

/**
 * TaskForm - Form for a single task within a task group.
 * Uses useTaskHandlers for all task-level handlers.
 */
const TaskForm: React.FC<TaskFormProps> = ({
  groupIndex,
  taskIndex,
  isOnly,
}) => {
  const { state } = useJobFormContext();
  const { isLoading, isSaving } = state;
  const loading = isLoading || isSaving;

  const {
    task,
    onInputChange,
    onCheckboxChange,
    onEnvVarChange,
    onAddEnvVar,
    onRemoveEnvVar,
    onArgsChange,
    onRemoveTask,
  } = useTaskHandlers(groupIndex, taskIndex);

  if (!task) return null;

  return (
    <ToggleableSection
      title={task.name || `Task ${taskIndex + 1}`}
      isRemovable={!isOnly}
      onRemove={onRemoveTask}
      isLoading={loading}
      defaultExpanded={false}
    >
      {/* Task Name */}
      <FormInputField
        id={`group-${groupIndex}-task-${taskIndex}-name`}
        name="name"
        label="Task Name"
        type="text"
        value={task.name}
        onChange={onInputChange}
        placeholder={`task-${taskIndex + 1}`}
        disabled={loading}
        required
        helpText="A unique name for this task within the group."
      />

      {/* Docker Image */}
      <FormInputField
        id={`group-${groupIndex}-task-${taskIndex}-image`}
        name="image"
        label="Docker Image"
        type="text"
        value={task.image}
        onChange={onInputChange}
        placeholder="nginx:latest"
        disabled={loading}
        required
      />

      {/* Private Registry Checkbox */}
      <FormInputField
        id={`group-${groupIndex}-task-${taskIndex}-usePrivateRegistry`}
        name="usePrivateRegistry"
        label="Use Private Container Registry"
        type="checkbox"
        value={task.usePrivateRegistry}
        onChange={onCheckboxChange}
        disabled={loading}
      />

      {/* Private Registry Credentials */}
      {task.usePrivateRegistry && (
        <PrivateRegistryForm
          dockerAuth={task.dockerAuth}
          onInputChange={onInputChange}
          isLoading={loading}
          groupIndex={groupIndex}
          taskIndex={taskIndex}
        />
      )}

      {/* Container Runtime */}
      <FormInputField
        id={`group-${groupIndex}-task-${taskIndex}-plugin`}
        name="plugin"
        label="Container Runtime"
        type="select"
        value={task.plugin}
        onChange={onInputChange}
        disabled={loading}
        className="mt-6"
        options={[
          { value: 'podman', label: 'Podman' },
          { value: 'docker', label: 'Docker' },
        ]}
      />

      {/* Command and arguments */}
      <FormInputField
        id={`group-${groupIndex}-task-${taskIndex}-command`}
        name="command"
        label="Command"
        type="text"
        value={task.command}
        onChange={onInputChange}
        placeholder="/bin/sh"
        disabled={loading}
        helpText="Replaces the image CMD; the image ENTRYPOINT still runs. Put arguments in the list below. Leave empty to use the image default."
      />
      <StringListEditor
        label="Arguments"
        values={task.args}
        onChange={onArgsChange}
        addLabel="Add Argument"
        placeholder="-c"
        helpText="One argument per row, without shell quoting. Nomad replaces ${...} references such as ${NOMAD_ALLOC_DIR}."
        disabled={loading}
      />

      {/* Resources */}
      <ResourcesForm
        resources={task.resources}
        onInputChange={onInputChange}
        isLoading={loading}
        groupIndex={groupIndex}
        taskIndex={taskIndex}
      />

      {/* Environment Variables */}
      <EnvVarsSection
        envVars={task.envVars}
        onEnvVarChange={onEnvVarChange}
        onAddEnvVar={onAddEnvVar}
        onRemoveEnvVar={onRemoveEnvVar}
        isLoading={loading}
      />

      {/* Nomad Environment Variables Information */}
      <NomadEnvironmentInfo />
    </ToggleableSection>
  );
};

export default TaskForm;
