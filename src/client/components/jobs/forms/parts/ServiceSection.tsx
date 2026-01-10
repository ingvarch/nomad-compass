import React from 'react';
import { Network, Settings2 } from 'lucide-react';
import { NomadServiceConfig, IngressConfig, NomadPort } from '../../../../types/nomad';
import FormInputField from '../../../ui/forms/FormInputField';
import IngressSection from './IngressSection';
import ServiceTagsEditor from './ServiceTagsEditor';
import { inputStyles, selectStyles } from '../../../../lib/styles';

interface ServiceSectionProps {
  enableService: boolean;
  serviceConfig?: NomadServiceConfig;
  ports: NomadPort[];
  groupName: string;
  onEnableServiceChange: (enabled: boolean) => void;
  onServiceConfigChange: (config: Partial<NomadServiceConfig>) => void;
  onIngressChange: (field: keyof IngressConfig, value: string | boolean) => void;
  onTagChange: (tagIndex: number, field: 'key' | 'value', value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tagIndex: number) => void;
  isLoading: boolean;
  groupIndex: number;
}

const defaultServiceConfig: NomadServiceConfig = {
  name: '',
  portLabel: 'http',
  provider: 'nomad',
  addressMode: 'alloc',
  tags: [],
  ingress: {
    enabled: false,
    domain: '',
    enableHttps: true,
    pathPrefix: '',
  },
  useAdvancedMode: false,
};

export const ServiceSection: React.FC<ServiceSectionProps> = ({
  enableService,
  serviceConfig = defaultServiceConfig,
  ports,
  groupName,
  onEnableServiceChange,
  onServiceConfigChange,
  onIngressChange,
  onTagChange,
  onAddTag,
  onRemoveTag,
  isLoading,
  groupIndex
}) => {
  // Get available port labels for dropdown
  const portLabels = ports.filter(p => p.label).map(p => p.label);

  return (
    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Network size={20} className="text-blue-600 dark:text-blue-400" />
        <h5 className="text-md font-medium text-gray-700 dark:text-gray-200">
          Service Discovery & Ingress
        </h5>
      </div>

      {/* Enable Service Discovery Toggle */}
      <FormInputField
        id={`group-${groupIndex}-enableService`}
        name="enableService"
        label="Enable Service Discovery"
        type="checkbox"
        value={enableService}
        onChange={(e) => onEnableServiceChange((e.target as HTMLInputElement).checked)}
        disabled={isLoading}
        helpText="Register this service with Nomad for discovery by Traefik or other services"
      />

      {enableService && (
        <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
          {/* Service Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Service Name
            </label>
            <input
              type="text"
              value={serviceConfig.name}
              onChange={(e) => onServiceConfigChange({ name: e.target.value })}
              placeholder={groupName || 'my-service'}
              className={inputStyles}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Unique name for service discovery. Defaults to task group name.
            </p>
          </div>

          {/* Port Label */}
          {portLabels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Port
              </label>
              <select
                value={serviceConfig.portLabel}
                onChange={(e) => onServiceConfigChange({ portLabel: e.target.value })}
                className={selectStyles}
                disabled={isLoading}
              >
                {portLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The port that Traefik will route traffic to
              </p>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Service Provider
            </label>
            <select
              value={serviceConfig.provider}
              onChange={(e) => onServiceConfigChange({ provider: e.target.value as 'nomad' | 'consul' })}
              className={selectStyles}
              disabled={isLoading}
            >
              <option value="nomad">Nomad (Native Service Discovery)</option>
              <option value="consul">Consul (Advanced Features)</option>
            </select>
          </div>

          {/* Mode Toggle: Simple vs Advanced */}
          <div className="flex items-center gap-4 pt-2 pb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Configuration Mode:</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
              <button
                type="button"
                onClick={() => onServiceConfigChange({ useAdvancedMode: false })}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  !serviceConfig.useAdvancedMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                disabled={isLoading}
              >
                <Network size={14} />
                Simple
              </button>
              <button
                type="button"
                onClick={() => onServiceConfigChange({ useAdvancedMode: true })}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  serviceConfig.useAdvancedMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                disabled={isLoading}
              >
                <Settings2 size={14} />
                Advanced
              </button>
            </div>
          </div>

          {/* Simple Mode: Ingress Configuration */}
          {!serviceConfig.useAdvancedMode && (
            <IngressSection
              ingress={serviceConfig.ingress}
              serviceName={serviceConfig.name || groupName}
              onChange={onIngressChange}
              isLoading={isLoading}
              groupIndex={groupIndex}
            />
          )}

          {/* Advanced Mode: Raw Tags Editor */}
          {serviceConfig.useAdvancedMode && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Service Tags
              </label>
              <ServiceTagsEditor
                tags={serviceConfig.tags}
                onTagChange={onTagChange}
                onAddTag={onAddTag}
                onRemoveTag={onRemoveTag}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceSection;
