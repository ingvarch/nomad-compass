import { useState, useEffect, useCallback } from 'react';
import { createNomadClient } from '../lib/api/nomad';
import { NomadAclToken } from '../types/acl';

interface AclPermissions {
  isLoading: boolean;
  /** True only for management tokens - use for ACL tab visibility */
  hasManagementAccess: boolean;
  /** True if user can list policies (management or has acl:read) */
  canListPolicies: boolean;
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
  const [canListPolicies, setCanListPolicies] = useState(false);
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

      // Only management tokens have full ACL access
      // This is used for ACL tab visibility
      const isManagement = token.Type === 'management';
      setHasManagementAccess(isManagement);

      // Check if user can list policies (for ACL page functionality)
      if (isManagement) {
        setCanListPolicies(true);
      } else {
        try {
          await client.getAclPolicies();
          setCanListPolicies(true);
        } catch {
          setCanListPolicies(false);
        }
      }
    } catch (err) {
      // If ACLs are disabled or token is invalid
      const message = err instanceof Error ? err.message : 'Failed to check ACL permissions';

      // Check if ACLs are disabled (403 with specific message or 500)
      if (message.includes('ACL support disabled') || message.includes('ACL disabled')) {
        setError('ACL system is disabled on this Nomad cluster');
      } else {
        setError(message);
      }
      setHasManagementAccess(false);
      setCanListPolicies(false);
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
    canListPolicies,
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
