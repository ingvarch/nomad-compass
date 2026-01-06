import { useState, useEffect, useCallback } from 'react';
import { createNomadClient } from '../lib/api/nomad';
import { NomadAclToken } from '../types/acl';

interface AclPermissions {
  isLoading: boolean;
  hasManagementAccess: boolean;
  currentToken: NomadAclToken | null;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check ACL permissions for the current user
 * Management tokens have full ACL access
 * Client tokens need specific policies to manage ACL
 */
export function useAclPermissions(): AclPermissions {
  const [isLoading, setIsLoading] = useState(true);
  const [hasManagementAccess, setHasManagementAccess] = useState(false);
  const [currentToken, setCurrentToken] = useState<NomadAclToken | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const client = createNomadClient();

    try {
      // Get current token info
      const token = await client.getAclTokenSelf();
      setCurrentToken(token);

      // Management tokens have full ACL access
      if (token.Type === 'management') {
        setHasManagementAccess(true);
      } else {
        // For client tokens, check if they can list ACL policies
        // If they can, they likely have some ACL management access
        try {
          await client.getAclPolicies();
          setHasManagementAccess(true);
        } catch {
          // Cannot list policies, no management access
          setHasManagementAccess(false);
        }
      }
    } catch (err) {
      // If ACLs are disabled or token is invalid
      const message = err instanceof Error ? err.message : 'Failed to check ACL permissions';

      // Check if ACLs are disabled (403 with specific message or 500)
      if (message.includes('ACL support disabled') || message.includes('ACL disabled')) {
        setError('ACL system is disabled on this Nomad cluster');
        setHasManagementAccess(false);
      } else {
        setError(message);
        setHasManagementAccess(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    isLoading,
    hasManagementAccess,
    currentToken,
    error,
    refetch: fetchPermissions,
  };
}

/**
 * Check if ACLs are enabled on the cluster
 */
export async function checkAclEnabled(): Promise<boolean> {
  const client = createNomadClient();
  try {
    await client.getAclTokenSelf();
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    // ACL disabled returns specific error
    if (message.includes('ACL support disabled') || message.includes('ACL disabled')) {
      return false;
    }
    // Other errors (like 403) mean ACLs are enabled but token doesn't have access
    return true;
  }
}
