import React from 'react';
import FormInputField from '../../../ui/forms/FormInputField';
import PortsSection from './PortsSection';
import { NomadPort } from '@/types/nomad';

interface NetworkSectionProps {
  enableNetwork: boolean;
  networkMode: 'none' | 'host' | 'bridge';
  ports: NomadPort[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onPortChange: (portIndex: number, field: keyof NomadPort, value: string) => void;
  onAddPort: () => void;
  onRemovePort: (portIndex: number) => void;
  isLoading: boolean;
  groupIndex: number;
}

export const NetworkSection: React.FC<NetworkSectionProps> = ({
  enableNetwork,
  networkMode,
  ports,
  onInputChange,
  onCheckboxChange,
  onPortChange,
  onAddPort,
  onRemovePort,
  isLoading,
  groupIndex
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <FormInputField
          id={`group-${groupIndex}-enableNetwork`}
          name="enableNetwork"
          label="Enable Network Configuration"
          type="checkbox"
          value={enableNetwork}
          onChange={onCheckboxChange}
          disabled={isLoading}
          className="mb-0"
        />
      </div>

      {enableNetwork && (
        <div className="border p-4 rounded-md bg-white">
          <FormInputField
            id={`group-${groupIndex}-networkMode`}
            name="networkMode"
            label="Network Mode"
            type="select"
            value={networkMode}
            onChange={onInputChange}
            disabled={isLoading}
            helpText="Select the container network mode. 'Bridge' is recommended for service discovery."
            options={[
              { value: 'bridge', label: 'Bridge' },
              { value: 'host', label: 'Host' },
              { value: 'none', label: 'None' }
            ]}
          />

          {/* Ports Configuration */}
          <PortsSection
            ports={ports}
            onPortChange={onPortChange}
            onAddPort={onAddPort}
            onRemovePort={onRemovePort}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
};

export default NetworkSection; 