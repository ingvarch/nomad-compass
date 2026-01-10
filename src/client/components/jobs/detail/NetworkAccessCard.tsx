import React, { useState } from 'react';
import { Globe, Server, Network, Copy, Check, ExternalLink, Lock } from 'lucide-react';
import type { NomadServiceRegistration } from '../../../types/nomad';

interface IngressInfo {
  domain: string;
  url: string;
  https: boolean;
  pathPrefix?: string;
}

interface NetworkAccessCardProps {
  job: {
    TaskGroups?: Array<{
      Name: string;
      Services?: Array<{
        Name: string;
        Tags?: string[];
        PortLabel?: string;
      }>;
    }>;
  };
  serviceRegistrations: NomadServiceRegistration[];
}

/**
 * Extract ingress URLs from Traefik service tags
 */
function extractIngressInfo(tags: string[]): IngressInfo | null {
  // Check if Traefik is enabled
  if (!tags.some(t => t === 'traefik.enable=true')) {
    return null;
  }

  // Find router rule with domain
  const ruleTag = tags.find(t => t.match(/traefik\.http\.routers\.[^.]+\.rule=/));
  if (!ruleTag) return null;

  // Extract domain from Host(`domain.com`)
  const hostMatch = ruleTag.match(/Host\(`([^`]+)`\)/);
  if (!hostMatch) return null;

  const domain = hostMatch[1];

  // Check if HTTPS is enabled
  const hasHttps = tags.some(t =>
    t.match(/traefik\.http\.routers\.[^.]+\.tls\.certresolver=/) ||
    t.match(/traefik\.http\.routers\.[^.]+\.tls$/)
  );

  // Extract path prefix if present
  const pathMatch = ruleTag.match(/PathPrefix\(`([^`]+)`\)/);
  const pathPrefix = pathMatch ? pathMatch[1] : undefined;

  const protocol = hasHttps ? 'https' : 'http';
  const url = `${protocol}://${domain}${pathPrefix || ''}`;

  return { domain, url, https: hasHttps, pathPrefix };
}

export const NetworkAccessCard: React.FC<NetworkAccessCardProps> = ({
  job,
  serviceRegistrations
}) => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Extract ingress info from job's service tags
  const ingressInfos: Array<IngressInfo & { serviceName: string }> = [];

  if (job.TaskGroups) {
    for (const group of job.TaskGroups) {
      if (!group.Services) continue;
      for (const service of group.Services) {
        if (!service.Tags) continue;
        const ingress = extractIngressInfo(service.Tags);
        if (ingress) {
          ingressInfos.push({ ...ingress, serviceName: service.Name });
        }
      }
    }
  }

  // Get unique internal addresses from service registrations
  const internalAddresses = serviceRegistrations.map(reg => ({
    address: `${reg.Address}:${reg.Port}`,
    serviceName: reg.ServiceName,
    allocId: reg.AllocID.substring(0, 8),
    datacenter: reg.Datacenter,
  }));

  // Don't render if there's nothing to show
  if (ingressInfos.length === 0 && internalAddresses.length === 0) {
    return null;
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch {
      // Clipboard API not available or permission denied
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Network className="w-5 h-5" />
          Network & Access
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* External URLs (Ingress) */}
        {ingressInfos.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              External Access
            </h4>
            <div className="space-y-2">
              {ingressInfos.map((ingress, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <a
                      href={ingress.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center gap-1.5"
                    >
                      {ingress.domain}
                      {ingress.pathPrefix && (
                        <span className="text-gray-500 dark:text-gray-400">{ingress.pathPrefix}</span>
                      )}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {ingress.https && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
                        <Lock className="w-3 h-3" />
                        HTTPS
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    via Traefik
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Internal Addresses */}
        {internalAddresses.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Server className="w-4 h-4" />
              Internal Address
            </h4>
            <div className="space-y-2">
              {internalAddresses.map((addr, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono text-gray-900 dark:text-white">
                      {addr.address}
                    </code>
                    <button
                      onClick={() => copyToClipboard(addr.address)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                      title="Copy to clipboard"
                    >
                      {copiedAddress === addr.address ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{addr.serviceName}</span>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <span>alloc: {addr.allocId}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkAccessCard;
