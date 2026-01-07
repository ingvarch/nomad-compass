import React from 'react';
import { NomadEnvVar, NomadPort, NomadHealthCheck, NomadServiceConfig, IngressConfig } from '../../../../types/nomad';
import TaskGroupForm from '../TaskGroupForm';

interface TaskGroupsSectionProps {
  taskGroups: Array<{
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
  }>;
  jobName: string;
  namespace: string;
  isLoading: boolean;
  onAddTaskGroup: () => void;
  onGroupInputChange: (groupIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onGroupCheckboxChange: (groupIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onEnvVarChange: (groupIndex: number, varIndex: number, field: 'key' | 'value', value: string) => void;
  onAddEnvVar: (groupIndex: number) => void;
  onRemoveEnvVar: (groupIndex: number, varIndex: number) => void;
  onPortChange: (groupIndex: number, portIndex: number, field: keyof NomadPort, value: string) => void;
  onAddPort: (groupIndex: number) => void;
  onRemovePort: (groupIndex: number, portIndex: number) => void;
  onHealthCheckChange: (groupIndex: number, field: keyof NomadHealthCheck, value: string | number) => void;
  // Network Configuration handler
  onEnableNetworkChange: (groupIndex: number, enabled: boolean) => void;
  // Service Discovery & Ingress handlers
  onEnableServiceChange: (groupIndex: number, enabled: boolean) => void;
  onServiceConfigChange: (groupIndex: number, config: Partial<NomadServiceConfig>) => void;
  onIngressChange: (groupIndex: number, field: keyof IngressConfig, value: string | boolean) => void;
  onTagChange: (groupIndex: number, tagIndex: number, field: 'key' | 'value', value: string) => void;
  onAddTag: (groupIndex: number) => void;
  onRemoveTag: (groupIndex: number, tagIndex: number) => void;
  onRemoveTaskGroup: (groupIndex: number) => void;
}

export const TaskGroupsSection: React.FC<TaskGroupsSectionProps> = ({
  taskGroups,
  jobName,
  namespace,
  isLoading,
  onAddTaskGroup,
  onGroupInputChange,
  onGroupCheckboxChange,
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
  onRemoveTaskGroup
}) => {
  return (
    <div className="mb-6 border-t pt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Task Groups</h3>
        <button
          type="button"
          onClick={onAddTaskGroup}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          Add Task Group
        </button>
      </div>

      <div className="space-y-6">
        {taskGroups.map((group, index) => (
          <TaskGroupForm
            key={index}
            groupIndex={index}
            group={group}
            isFirst={index === 0}
            onInputChange={(e) => onGroupInputChange(index, e)}
            onCheckboxChange={(e) => onGroupCheckboxChange(index, e)}
            onEnvVarChange={(varIndex, field, value) => onEnvVarChange(index, varIndex, field, value)}
            onAddEnvVar={() => onAddEnvVar(index)}
            onRemoveEnvVar={(varIndex) => onRemoveEnvVar(index, varIndex)}
            onPortChange={(portIndex, field, value) => onPortChange(index, portIndex, field, value)}
            onAddPort={() => onAddPort(index)}
            onRemovePort={(portIndex) => onRemovePort(index, portIndex)}
            onHealthCheckChange={(field, value) => onHealthCheckChange(index, field, value)}
            onEnableNetworkChange={(enabled) => onEnableNetworkChange(index, enabled)}
            onEnableServiceChange={(enabled) => onEnableServiceChange(index, enabled)}
            onServiceConfigChange={(config) => onServiceConfigChange(index, config)}
            onIngressChange={(field, value) => onIngressChange(index, field, value)}
            onTagChange={(tagIndex, field, value) => onTagChange(index, tagIndex, field, value)}
            onAddTag={() => onAddTag(index)}
            onRemoveTag={(tagIndex) => onRemoveTag(index, tagIndex)}
            onRemoveGroup={() => onRemoveTaskGroup(index)}
            jobName={jobName}
            namespace={namespace}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskGroupsSection;
