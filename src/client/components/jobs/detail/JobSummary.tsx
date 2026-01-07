import React from 'react';
import { ExternalLink } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { NomadAllocation } from '../../../types/nomad';

interface IngressInfo {
  domain: string;
  url: string;
  https: boolean;
}

interface JobSummaryProps {
  job: {
    Status: string;
    Stop?: boolean;
    Type: string;
    Priority: number;
    Datacenters?: string[];
    SubmitTime?: number;
    Namespace?: string;
    Version?: number;
    TaskGroups?: Array<{
      Services?: Array<{
        Tags?: string[];
      }>;
    }>;
  };
  allocations?: NomadAllocation[];
  createTime?: number | null;
}

/**
 * Extract ingress URLs from Traefik service tags
 */
function extractIngressUrls(job: JobSummaryProps['job']): IngressInfo[] {
  const ingresses: IngressInfo[] = [];

  if (!job.TaskGroups) return ingresses;

  for (const group of job.TaskGroups) {
    if (!group.Services) continue;

    for (const service of group.Services) {
      if (!service.Tags) continue;

      // Check if Traefik is enabled
      const enableTag = service.Tags.find(t => t === 'traefik.enable=true');
      if (!enableTag) continue;

      // Find router rule with domain
      const ruleTag = service.Tags.find(t => t.match(/traefik\.http\.routers\.[^.]+\.rule=/));
      if (!ruleTag) continue;

      // Extract domain from Host(`domain.com`)
      const hostMatch = ruleTag.match(/Host\(`([^`]+)`\)/);
      if (!hostMatch) continue;

      const domain = hostMatch[1];

      // Check if HTTPS is enabled (has certresolver or tls config)
      const hasHttps = service.Tags.some(t =>
        t.match(/traefik\.http\.routers\.[^.]+\.tls\.certresolver=/) ||
        t.match(/traefik\.http\.routers\.[^.]+\.tls$/)
      );

      // Extract path prefix if present
      const pathMatch = ruleTag.match(/PathPrefix\(`([^`]+)`\)/);
      const pathPrefix = pathMatch ? pathMatch[1] : '';

      const protocol = hasHttps ? 'https' : 'http';
      const url = `${protocol}://${domain}${pathPrefix}`;

      // Avoid duplicates
      if (!ingresses.some(i => i.url === url)) {
        ingresses.push({ domain, url, https: hasHttps });
      }
    }
  }

  return ingresses;
}

const NANOSECONDS_TO_MILLISECONDS = 1_000_000;

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const formatDate = (nanoseconds: number): string => {
  return dateFormatter.format(new Date(nanoseconds / NANOSECONDS_TO_MILLISECONDS));
};

export const JobSummary: React.FC<JobSummaryProps> = ({ job, allocations, createTime }) => {
  const ingresses = extractIngressUrls(job);

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Job Summary
        </h3>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <dl>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 rounded-md">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                <StatusBadge status={job.Status} isStopped={job.Stop} allocations={allocations} />
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Type
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {job.Type}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 rounded-md">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Priority
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {job.Priority}
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Datacenters
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {job.Datacenters && job.Datacenters.join(', ')}
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <dl>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 rounded-md">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Created
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {createTime ? formatDate(createTime) : 'Unknown'}
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Modified
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {job.SubmitTime ? formatDate(job.SubmitTime) : 'Unknown'}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 rounded-md">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Namespace
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {job.Namespace || 'default'}
                </span>
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Version
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {job.Version ?? 'Unknown'}
              </dd>
            </div>
            {ingresses.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 rounded-md">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Ingress
                </dt>
                <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2 space-y-1">
                  {ingresses.map((ingress, idx) => (
                    <a
                      key={idx}
                      href={ingress.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{ingress.domain}</span>
                      {ingress.https && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
                          HTTPS
                        </span>
                      )}
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default JobSummary;
