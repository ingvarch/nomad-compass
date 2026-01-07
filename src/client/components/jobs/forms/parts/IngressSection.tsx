import React from 'react';
import { Globe, Lock, Route } from 'lucide-react';
import { IngressConfig } from '../../../../types/nomad';
import FormInputField from '../../../ui/forms/FormInputField';

interface IngressSectionProps {
  ingress: IngressConfig;
  serviceName: string;
  onChange: (field: keyof IngressConfig, value: string | boolean) => void;
  isLoading: boolean;
  groupIndex: number;
}

export const IngressSection: React.FC<IngressSectionProps> = ({
  ingress,
  serviceName,
  onChange,
  isLoading,
  groupIndex
}) => {
  // Generate preview of what tags will be created
  const generatePreviewTags = (): string[] => {
    if (!ingress.enabled || !ingress.domain) return [];

    const routerName = serviceName.replace(/[^a-zA-Z0-9]/g, '-') || 'app';
    const tags: string[] = [
      'traefik.enable=true',
      `traefik.http.routers.${routerName}.rule=Host(\`${ingress.domain}\`)`,
    ];

    if (ingress.enableHttps) {
      tags.push(`traefik.http.routers.${routerName}.entrypoints=websecure`);
      tags.push(`traefik.http.routers.${routerName}.tls.certresolver=letsencrypt`);
    } else {
      tags.push(`traefik.http.routers.${routerName}.entrypoints=web`);
    }

    if (ingress.pathPrefix) {
      // Replace the simple Host rule with Host + PathPrefix
      tags[1] = `traefik.http.routers.${routerName}.rule=Host(\`${ingress.domain}\`) && PathPrefix(\`${ingress.pathPrefix}\`)`;
    }

    return tags;
  };

  const previewTags = generatePreviewTags();

  return (
    <div className="space-y-4">
      {/* Enable Ingress Toggle */}
      <FormInputField
        id={`group-${groupIndex}-ingress-enabled`}
        name="ingress-enabled"
        label="Enable Ingress (Traefik)"
        type="checkbox"
        value={ingress.enabled}
        onChange={(e) => onChange('enabled', (e.target as HTMLInputElement).checked)}
        disabled={isLoading}
        helpText="Expose this service to the internet via Traefik reverse proxy"
      />

      {ingress.enabled && (
        <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800 space-y-4">
          {/* Domain Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Globe size={16} />
              Domain
            </label>
            <input
              type="text"
              value={ingress.domain}
              onChange={(e) => onChange('domain', e.target.value)}
              placeholder="myapp.example.com"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The domain name that will route to this service
            </p>
          </div>

          {/* HTTPS Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={`group-${groupIndex}-ingress-https`}
              checked={ingress.enableHttps}
              onChange={(e) => onChange('enableHttps', e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor={`group-${groupIndex}-ingress-https`}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <Lock size={16} className="text-green-600" />
              Enable HTTPS (Let's Encrypt)
            </label>
          </div>

          {/* Path Prefix (Optional) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Route size={16} />
              Path Prefix (optional)
            </label>
            <input
              type="text"
              value={ingress.pathPrefix || ''}
              onChange={(e) => onChange('pathPrefix', e.target.value)}
              placeholder="/api"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Optional path prefix for path-based routing (e.g., /api, /blog)
            </p>
          </div>

          {/* Preview Generated Tags */}
          {previewTags.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Generated Traefik tags:
              </p>
              <div className="space-y-1">
                {previewTags.map((tag, idx) => (
                  <code key={idx} className="block text-xs text-gray-700 dark:text-gray-300 font-mono break-all">
                    {tag}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IngressSection;
