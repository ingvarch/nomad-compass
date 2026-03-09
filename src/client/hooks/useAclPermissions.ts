import { useState, useEffect, useCallback } from 'react';
import { createNomadClient } from '../lib/api/nomad';
import { getErrorMessage } from '../lib/errors';
import { NomadAclToken } from '../types/acl';

interface AclPermissions {
  isLoading: boolean;
  /** True only for management tokens - use for ACL tab visibility */
  hasManagementAccess: boolean;
  currentToken: NomadAclToken | null;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check ACL permissions for the current user.
 * Management tokens have full ACL access.
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

      // Only management tokens have full ACL access
      // This is used for ACL tab visibility
      setHasManagementAccess(token.Type === 'management');
    } catch (err) {
      // If ACLs are disabled or token is invalid
      const message = getErrorMessage(err, 'Failed to check ACL permissions');

      // Check if ACLs are disabled (403 with specific message or 500)
      if (message.includes('ACL support disabled') || message.includes('ACL disabled')) {
        setError('ACL system is disabled on this Nomad cluster');
      } else {
        setError(message);
      }
      setHasManagementAccess(false);
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
