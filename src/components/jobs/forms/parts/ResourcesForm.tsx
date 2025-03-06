import React from 'react';
import FormInputField from '../../../ui/forms/FormInputField';
import { NomadResource } from '@/types/nomad';

interface ResourcesFormProps {
  resources: NomadResource;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  isLoading: boolean;
  groupIndex: number;
}

export const ResourcesForm: React.FC<ResourcesFormProps> = ({
  resources,
  onInputChange,
  isLoading,
  groupIndex
}) => {
  return (
    <div className="mb-4">
      <h5 className="text-md font-medium text-gray-700 mb-2">Resources</h5>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormInputField
          id={`group-${groupIndex}-resources.CPU`}
          name="resources.CPU"
          label="CPU (MHz)"
          type="number"
          value={resources.CPU}
          onChange={onInputChange}
          min={100}
          disabled={isLoading}
        />

        <FormInputField
          id={`group-${groupIndex}-resources.MemoryMB`}
          name="resources.MemoryMB"
          label="Memory (MB)"
          type="number"
          value={resources.MemoryMB}
          onChange={onInputChange}
          min={32}
          disabled={isLoading}
        />

        <FormInputField
          id={`group-${groupIndex}-resources.DiskMB`}
          name="resources.DiskMB"
          label="Disk (MB)"
          type="number"
          value={resources.DiskMB}
          onChange={onInputChange}
          min={10}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default ResourcesForm; 