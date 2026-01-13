import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { createNomadClient } from '../../../lib/api/nomad';
import {
  NomadAclTokenListItem,
  NomadAclToken,
  NomadAclPolicyListItem,
  NomadAclRoleListItem,
} from '../../../types/acl';
import { LoadingSpinner, ErrorAlert, RefreshButton, Modal, Button, ConfirmationDialog, Badge } from '../../ui';
import { DeleteButton } from '../../ui/IconButton';
import { TokenForm } from '../token/TokenForm';
import { SecretIdDisplay } from '../token/SecretIdDisplay';
import { useCrudTab } from '../../../hooks/useCrudTab';
import {
  tableStyles,
  tableHeaderStyles,
  tableHeaderCellStyles,
  tableBodyStyles,
  tableRowHoverStyles,
} from '../../../lib/styles';

interface TokensTabProps {
  hasManagementAccess: boolean;
}

export function TokensTab({ hasManagementAccess }: TokensTabProps) {
  // Token-specific state (not handled by useCrudTab)
  const [policies, setPolicies] = useState<NomadAclPolicyListItem[]>([]);
  const [roles, setRoles] = useState<NomadAclRoleListItem[]>([]);
  const [currentTokenId, setCurrentTokenId] = useState<string | null>(null);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<NomadAclToken | null>(null);

  // Fetch tokens list
  const fetchTokens = useCallback(async () => {
    const client = createNomadClient();
    return client.getAclTokens();
  }, []);

  // Delete token
  const deleteToken = useCallback(async (token: NomadAclTokenListItem) => {
    const client = createNomadClient();
    await client.deleteAclToken(token.AccessorID);
  }, []);

  // Use CRUD hook for standard operations
  const {
    items: tokens,
    loading,
    error,
    showCreateModal,
    deletingItem: deletingToken,
    deleteLoading,
    refetch,
    openCreateModal,
    closeCreateModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
  } = useCrudTab<NomadAclTokenListItem>({
    fetchData: fetchTokens,
    deleteItem: deleteToken,
    getDeletedItemName: (token) => `Token "${token.Name || 'Unnamed'}"`,
    fetchErrorMessage: 'Failed to fetch tokens',
    deleteErrorMessage: 'Failed to revoke token',
  });

  // Fetch additional data (policies, roles, self token) on mount and after refetch
  useEffect(() => {
    const fetchAdditionalData = async () => {
      const client = createNomadClient();
      try {
        const [policiesData, rolesData, selfToken] = await Promise.all([
          client.getAclPolicies(),
          client.getAclRoles(),
          client.getAclTokenSelf().catch(() => null),
        ]);
        setPolicies(policiesData || []);
        setRoles(rolesData || []);
        if (selfToken) {
          setCurrentTokenId(selfToken.AccessorID);
        }
      } catch {
        // Silently fail for additional data - main tokens list error is handled by hook
      }
    };

    fetchAdditionalData();
  }, [tokens]); // Re-fetch when tokens change (after refetch)

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleCreateToken = async (tokenData: {
    name: string;
    type: 'client' | 'management';
    policies: string[];
    roles: string[];
    expirationTTL?: string;
    global: boolean;
  }) => {
    const client = createNomadClient();

    const payload: {
      Name: string;
      Type: 'client' | 'management';
      Policies?: string[];
      Roles?: { Name: string }[];
      ExpirationTTL?: string;
      Global?: boolean;
    } = {
      Name: tokenData.name,
      Type: tokenData.type,
    };

    if (tokenData.type === 'client') {
      if (tokenData.policies.length > 0) {
        payload.Policies = tokenData.policies;
      }
      if (tokenData.roles.length > 0) {
        payload.Roles = tokenData.roles.map((r) => ({ Name: r }));
      }
    }

    if (tokenData.expirationTTL) {
      payload.ExpirationTTL = tokenData.expirationTTL;
    }

    if (tokenData.global) {
      payload.Global = true;
    }

    const createdToken = await client.createAclToken(payload);
    setNewlyCreatedToken(createdToken);
    closeCreateModal();
    await refetch();
  };

  const formatExpiration = (expirationTime?: string) => {
    if (!expirationTime) return 'Never';
    const date = new Date(expirationTime);
    if (date < new Date()) return 'Expired';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const truncateId = (id: string) => {
    if (id.length <= 12) return id;
    return id.substring(0, 8) + '...' + id.substring(id.length - 4);
  };

  const isCurrentToken = (token: NomadAclTokenListItem) => {
    return currentTokenId === token.AccessorID;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <LoadingSpinner size="sm" className="h-32" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            ACL Tokens
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tokens.length} token{tokens.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {hasManagementAccess && (
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Create Token
            </Button>
          )}
          <RefreshButton onClick={refetch} />
        </div>
      </div>

      {/* Error */}
      {error && <ErrorAlert message={error} variant="bar" />}

      {/* Table */}
      {tokens.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
          No tokens found.{' '}
          {hasManagementAccess && (
            <button
              onClick={openCreateModal}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create your first token
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={tableStyles}>
            <thead className={tableHeaderStyles}>
              <tr>
                <th className={tableHeaderCellStyles}>Name</th>
                <th className={tableHeaderCellStyles}>Accessor ID</th>
                <th className={tableHeaderCellStyles}>Type</th>
                <th className={tableHeaderCellStyles}>Policies / Roles</th>
                <th className={tableHeaderCellStyles}>Expires</th>
                {hasManagementAccess && <th className={`${tableHeaderCellStyles} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody className={tableBodyStyles}>
              {tokens.map((token) => (
                <tr key={token.AccessorID} className={tableRowHoverStyles}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {token.Name || '-'}
                    </span>
                    {isCurrentToken(token) && (
                      <Badge variant="blue" className="ml-2">Current</Badge>
                    )}
                    {token.Global && (
                      <Badge variant="purple" className="ml-2">Global</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <code className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                      {truncateId(token.AccessorID)}
                    </code>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={token.Type === 'management' ? 'red' : 'green'}>
                      {token.Type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {token.Policies?.map((p) => (
                        <Badge key={p} variant="blue">{p}</Badge>
                      ))}
                      {token.Roles?.map((r) => (
                        <Badge key={r.ID} variant="yellow">{r.Name}</Badge>
                      ))}
                      {token.Type === 'management' && (
                        <span className="text-xs text-gray-400">Full access</span>
                      )}
                      {token.Type === 'client' &&
                        (!token.Policies || token.Policies.length === 0) &&
                        (!token.Roles || token.Roles.length === 0) && (
                          <span className="text-xs text-gray-400">No permissions</span>
                        )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatExpiration(token.ExpirationTime)}
                    </span>
                  </td>
                  {hasManagementAccess && (
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <DeleteButton
                        onClick={() => openDeleteConfirm(token)}
                        disabled={isCurrentToken(token)}
                        title={isCurrentToken(token) ? 'Cannot revoke your own token' : 'Revoke token'}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        title="Create Token"
        size="lg"
      >
        <TokenForm
          availablePolicies={policies}
          availableRoles={roles}
          onSubmit={handleCreateToken}
          onCancel={closeCreateModal}
        />
      </Modal>

      {/* Secret ID Display Modal */}
      <Modal
        isOpen={newlyCreatedToken !== null}
        onClose={() => setNewlyCreatedToken(null)}
        title="Token Created"
      >
        {newlyCreatedToken && (
          <SecretIdDisplay
            token={newlyCreatedToken}
            onClose={() => setNewlyCreatedToken(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deletingToken !== null}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Revoke Token"
        message={
          deletingToken && (
            <>
              <p className="mb-3">Are you sure you want to revoke this token?</p>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Name:</strong> {deletingToken.Name || 'Unnamed'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Accessor ID:</strong>{' '}
                  <code className="font-mono">{deletingToken.AccessorID}</code>
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone. Anyone using this token will immediately lose access.
              </p>
            </>
          )
        }
        mode="delete"
        confirmLabel="Revoke Token"
        isLoading={deleteLoading}
      />
    </div>
  );
}
