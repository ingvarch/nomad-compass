import type { NomadJobFormData } from '../../types/nomad';

/**
 * Generates a clone name from the original job name
 * Examples: "myapp" → "myapp-copy-1", "myapp-copy-1" → "myapp-copy-2"
 */
function generateCloneName(originalName: string): string {
  // Check if the name already ends with -copy-N pattern
  const copyPattern = /^(.+)-copy-(\d+)$/;
  const match = originalName.match(copyPattern);

  if (match) {
    // Increment the existing copy number
    const baseName = match[1];
    const currentNumber = parseInt(match[2], 10);
    return `${baseName}-copy-${currentNumber + 1}`;
  }

  // New clone - add -copy-1 suffix
  return `${originalName}-copy-1`;
}

/**
 * Modifies an ingress domain for a cloned job to avoid conflicts
 * Examples:
 *   "myapp.example.com" → "myapp-copy-1.example.com"
 *   "api.prod.example.com" → "api-copy-1.prod.example.com"
 */
function modifyIngressDomainForClone(domain: string, cloneSuffix: string): string {
  if (!domain) return domain;

  // Extract the copy number from the suffix (e.g., "myapp-copy-1" → "copy-1")
  const suffixMatch = cloneSuffix.match(/-copy-(\d+)$/);
  const copySuffix = suffixMatch ? `-copy-${suffixMatch[1]}` : '-copy-1';

  // Split domain into parts
  const parts = domain.split('.');

  if (parts.length < 2) {
    // Simple domain without dots - just append suffix
    return `${domain}${copySuffix}`;
  }

  // Modify only the first subdomain segment
  parts[0] = `${parts[0]}${copySuffix}`;
  return parts.join('.');
}

/**
 * Generates a clone suffix from the clone name
 * Examples: "myapp-copy-1" → "-copy-1"
 */
function getCloneSuffix(cloneName: string): string {
  const match = cloneName.match(/(-copy-\d+)$/);
  return match ? match[1] : '-copy-1';
}

/**
 * Prepares form data for cloning a job
 * Modifies job name, task group names, service names, and ingress domain to avoid conflicts
 */
export function prepareCloneFormData(formData: NomadJobFormData): NomadJobFormData {
  const cloneName = generateCloneName(formData.name);
  const cloneSuffix = getCloneSuffix(cloneName);

  return {
    ...formData,
    name: cloneName,
    taskGroups: formData.taskGroups.map((group) => {
      // Generate new task group name
      const newGroupName = `${group.name}${cloneSuffix}`;

      // Generate new service name
      const newServiceName = group.serviceConfig?.name
        ? `${group.serviceConfig.name}${cloneSuffix}`
        : newGroupName;

      // Build updated service config
      let updatedServiceConfig = group.serviceConfig;
      if (updatedServiceConfig) {
        updatedServiceConfig = {
          ...updatedServiceConfig,
          name: newServiceName,
        };

        // If ingress is enabled, modify the domain
        if (updatedServiceConfig.ingress?.enabled && updatedServiceConfig.ingress?.domain) {
          updatedServiceConfig = {
            ...updatedServiceConfig,
            ingress: {
              ...updatedServiceConfig.ingress,
              domain: modifyIngressDomainForClone(updatedServiceConfig.ingress.domain, cloneName),
            },
          };
        }
      }

      return {
        ...group,
        name: newGroupName,
        serviceConfig: updatedServiceConfig,
      };
    }),
  };
}
