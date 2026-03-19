import React from 'react';
import FormInputField from '../../../ui/forms/FormInputField';
import { NomadHealthCheck } from '../../../../types/nomad';

interface HealthCheckSectionProps {
  enableHealthCheck: boolean;
  healthCheck?: NomadHealthCheck;
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onHealthCheckChange: (field: keyof NomadHealthCheck, value: string | number | boolean) => void;
  isLoading: boolean;
  groupIndex: number;
}

const HealthCheckSection: React.FC<HealthCheckSectionProps> = ({
  enableHealthCheck,
  healthCheck,
  onCheckboxChange,
  onHealthCheckChange,
  isLoading,
  groupIndex
}) => {
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

      {enableHealthCheck && healthCheck && (
        <div className="border p-4 rounded-md bg-white dark:bg-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: check type & target */}
            <div className="space-y-4">
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

              {healthCheck.type === 'http' && (
                <FormInputField
                  id={`group-${groupIndex}-healthCheck-method`}
                  name="healthCheck.method"
                  label="HTTP Method"
                  type="select"
                  value={healthCheck.method || 'GET'}
                  onChange={(e) => onHealthCheckChange('method', e.target.value === 'GET' ? '' : e.target.value)}
                  disabled={isLoading}
                  options={[
                    { value: 'GET', label: 'GET' },
                    { value: 'HEAD', label: 'HEAD' },
                    { value: 'POST', label: 'POST' },
                    { value: 'PUT', label: 'PUT' },
                  ]}
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
                id={`group-${groupIndex}-healthCheck-ignoreWarnings`}
                name="healthCheck.ignoreWarnings"
                label="Ignore Warnings"
                type="checkbox"
                value={healthCheck.ignoreWarnings ?? false}
                onChange={(e) => onHealthCheckChange('ignoreWarnings', (e.target as HTMLInputElement).checked)}
                disabled={isLoading}
              />
            </div>

            {/* Right column: timing & restart params */}
            <div className="space-y-4">
              <FormInputField
                id={`group-${groupIndex}-healthCheck-interval`}
                name="healthCheck.interval"
                label="Interval (s)"
                type="number"
                value={healthCheck.interval}
                onChange={(e) => onHealthCheckChange('interval', e.target.value)}
                min={1}
                disabled={isLoading}
              />

              <FormInputField
                id={`group-${groupIndex}-healthCheck-timeout`}
                name="healthCheck.timeout"
                label="Timeout (s)"
                type="number"
                value={healthCheck.timeout}
                onChange={(e) => onHealthCheckChange('timeout', e.target.value)}
                min={1}
                disabled={isLoading}
              />

              <FormInputField
                id={`group-${groupIndex}-healthCheck-initialDelay`}
                name="healthCheck.initialDelay"
                label="Grace Period (s)"
                type="number"
                value={healthCheck.initialDelay ?? 5}
                onChange={(e) => onHealthCheckChange('initialDelay', e.target.value)}
                min={0}
                disabled={isLoading}
                helpText="Delay before failures count"
              />

              <FormInputField
                id={`group-${groupIndex}-healthCheck-failuresBeforeUnhealthy`}
                name="healthCheck.failuresBeforeUnhealthy"
                label="Failures to Restart"
                type="number"
                value={healthCheck.failuresBeforeUnhealthy}
                onChange={(e) => onHealthCheckChange('failuresBeforeUnhealthy', e.target.value)}
                min={0}
                disabled={isLoading}
                helpText="0 = disable restart"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthCheckSection; 