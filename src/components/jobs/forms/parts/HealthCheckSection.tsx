import React from 'react';
import FormInputField from '../../../ui/forms/FormInputField';
import { NomadHealthCheck } from '@/types/nomad';

interface HealthCheckSectionProps {
  enableHealthCheck: boolean;
  healthCheck?: NomadHealthCheck;
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onHealthCheckChange: (field: keyof NomadHealthCheck, value: string | number) => void;
  isLoading: boolean;
  groupIndex: number;
}

export const HealthCheckSection: React.FC<HealthCheckSectionProps> = ({
  enableHealthCheck,
  healthCheck,
  onCheckboxChange,
  onHealthCheckChange,
  isLoading,
  groupIndex
}) => {
  if (!healthCheck) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <FormInputField
          id={`group-${groupIndex}-enableHealthCheck`}
          name="enableHealthCheck"
          label="Enable Health Check"
          type="checkbox"
          value={enableHealthCheck}
          onChange={onCheckboxChange}
          disabled={isLoading}
          className="mb-0"
        />
      </div>

      {enableHealthCheck && (
        <div className="border p-4 rounded-md bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInputField
              id={`group-${groupIndex}-healthCheck-type`}
              name="healthCheck.type"
              label="Check Type"
              type="select"
              value={healthCheck.type}
              onChange={(e) => onHealthCheckChange('type', e.target.value)}
              disabled={isLoading}
              options={[
                { value: 'http', label: 'HTTP' },
                { value: 'tcp', label: 'TCP' },
                { value: 'script', label: 'Script' }
              ]}
            />

            {healthCheck.type === 'http' && (
              <FormInputField
                id={`group-${groupIndex}-healthCheck-path`}
                name="healthCheck.path"
                label="HTTP Path"
                type="text"
                value={healthCheck.path || ''}
                onChange={(e) => onHealthCheckChange('path', e.target.value)}
                placeholder="/health"
                disabled={isLoading}
              />
            )}

            {healthCheck.type === 'script' && (
              <FormInputField
                id={`group-${groupIndex}-healthCheck-command`}
                name="healthCheck.command"
                label="Script Command"
                type="text"
                value={healthCheck.command || ''}
                onChange={(e) => onHealthCheckChange('command', e.target.value)}
                placeholder="/bin/check-health.sh"
                disabled={isLoading}
              />
            )}

            <FormInputField
              id={`group-${groupIndex}-healthCheck-interval`}
              name="healthCheck.interval"
              label="Check Interval (seconds)"
              type="number"
              value={healthCheck.interval}
              onChange={(e) => onHealthCheckChange('interval', e.target.value)}
              min={1}
              disabled={isLoading}
            />

            <FormInputField
              id={`group-${groupIndex}-healthCheck-timeout`}
              name="healthCheck.timeout"
              label="Timeout (seconds)"
              type="number"
              value={healthCheck.timeout}
              onChange={(e) => onHealthCheckChange('timeout', e.target.value)}
              min={1}
              disabled={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthCheckSection; 