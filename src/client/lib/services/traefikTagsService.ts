import type { NomadServiceTag, IngressConfig } from '../../types/nomad';

/**
 * Generates Traefik service tags from ingress configuration (Simple Mode)
 */
export function generateTraefikTags(serviceName: string, ingress: IngressConfig): string[] {
  if (!ingress.enabled || !ingress.domain) {
    return [];
  }

  // Sanitize service name for use as router name
  const routerName = serviceName.replace(/[^a-zA-Z0-9]/g, '-');
  const tags: string[] = ['traefik.enable=true'];

  // Build the routing rule
  let routeRule = `Host(\`${ingress.domain}\`)`;
  if (ingress.pathPrefix) {
    routeRule = `Host(\`${ingress.domain}\`) && PathPrefix(\`${ingress.pathPrefix}\`)`;
  }
  tags.push(`traefik.http.routers.${routerName}.rule=${routeRule}`);

  // Configure entrypoints and TLS
  if (ingress.enableHttps) {
    tags.push(`traefik.http.routers.${routerName}.entrypoints=websecure`);
    tags.push(`traefik.http.routers.${routerName}.tls.certresolver=letsencrypt`);
  } else {
    tags.push(`traefik.http.routers.${routerName}.entrypoints=web`);
  }

  return tags;
}

/**
 * Converts raw service tags array to string array for Nomad
 */
export function serviceTagsToStrings(tags: NomadServiceTag[]): string[] {
  return tags
    .filter((t) => t.key.trim() !== '')
    .map((t) => (t.value ? `${t.key}=${t.value}` : t.key));
}

/**
 * Parses Traefik tags back to IngressConfig (for edit mode)
 */
export function parseTraefikTagsToIngress(tags: NomadServiceTag[]): IngressConfig {
  const defaultConfig: IngressConfig = {
    enabled: false,
    domain: '',
    enableHttps: true,
    pathPrefix: '',
  };

  // Check if traefik is enabled
  const enableTag = tags.find((t) => t.key === 'traefik.enable');
  if (!enableTag || enableTag.value !== 'true') {
    return defaultConfig;
  }

  // Find the router rule to extract domain
  const ruleTag = tags.find((t) => t.key.match(/traefik\.http\.routers\.[^.]+\.rule/));
  if (!ruleTag) {
    return defaultConfig;
  }

  // Parse domain from rule: Host(`domain.com`) or Host(`domain.com`) && PathPrefix(`/api`)
  const hostMatch = ruleTag.value.match(/Host\(`([^`]+)`\)/);
  const domain = hostMatch ? hostMatch[1] : '';

  // Parse path prefix if present
  const pathMatch = ruleTag.value.match(/PathPrefix\(`([^`]+)`\)/);
  const pathPrefix = pathMatch ? pathMatch[1] : '';

  // Check for HTTPS (certresolver or tls)
  const httpsTag = tags.find(
    (t) =>
      t.key.match(/traefik\.http\.routers\.[^.]+\.tls\.certresolver/) ||
      t.key.match(/traefik\.http\.routers\.[^.]+\.tls$/)
  );
  const enableHttps = !!httpsTag;

  return {
    enabled: !!domain,
    domain,
    enableHttps,
    pathPrefix,
  };
}
