import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { createNomadClient } from '../../../lib/api/nomad';
import {
  NomadAclTokenListItem,
  NomadAclToken,
  NomadAclPolicyListItem,
  NomadAclRoleListItem,
} from '../../../types/acl';
import { LoadingSpinner, ErrorAlert, RefreshButton, Modal, Button, ConfirmationDialog } from '../../ui';
import { DeleteButton } from '../../ui/IconButton';
import { TokenForm } from '../token/TokenForm';
import { SecretIdDisplay } from '../token/SecretIdDisplay';
import { useToast } from '../../../context/ToastContext';
import { getErrorMessage } from '../../../lib/constants';

interface TokensTabProps {
  hasManagementAccess: boolean;
}

export function TokensTab({ hasManagementAccess }: TokensTabProps) {
  const [tokens, setTokens] = useState<NomadAclTokenListItem[]>([]);
  const [policies, setPolicies] = useState<NomadAclPolicyListItem[]>([]);
  const [roles, setRoles] = useState<NomadAclRoleListItem[]>([]);
  const [currentTokenId, setCurrentTokenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<NomadAclToken | null>(null);
  const [deletingToken, setDeletingToken] = useState<NomadAclTokenListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const client = createNomadClient();
    try {
      const [tokensData, policiesData, rolesData, selfToken] = await Promise.all([
        client.getAclTokens(),
        client.getAclPolicies(),
        client.getAclRoles(),
        client.getAclTokenSelf().catch(() => null),
      ]);
      setTokens(tokensData || []);
      setPolicies(policiesData || []);
      setRoles(rolesData || []);
      if (selfToken) {
        setCurrentTokenId(selfToken.AccessorID);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch tokens'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    setShowCreateModal(false);
    await fetchData();
  };

  const handleDeleteToken = async () => {
    if (!deletingToken) return;

    setDeleteLoading(true);
    const client = createNomadClient();
    try {
      await client.deleteAclToken(deletingToken.AccessorID);
      addToast('Token revoked successfully', 'success');
      setDeletingToken(null);
      await fetchData();
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to revoke token'), 'error');
    } finally {
      setDeleteLoading(false);
    }
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
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Token
            </Button>
          )}
          <RefreshButton onClick={() => fetchData()} />
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
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create your first token
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Accessor ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Policies / Roles
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Expires
                </th>
                {hasManagementAccess && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tokens.map((token) => (
                <tr
                  key={token.AccessorID}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {token.Name || '-'}
                    </span>
                    {isCurrentToken(token) && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        Current
                      </span>
                    )}
                    {token.Global && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                        Global
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <code className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                      {truncateId(token.AccessorID)}
                    </code>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        token.Type === 'management'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}
                    >
                      {token.Type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {token.Policies?.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                        >
                          {p}
                        </span>
                      ))}
                      {token.Roles?.map((r) => (
                        <span
                          key={r.ID}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                        >
                          {r.Name}
                        </span>
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
                        onClick={() => setDeletingToken(token)}
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
        onClose={() => setShowCreateModal(false)}
        title="Create Token"
        size="lg"
      >
        <TokenForm
          availablePolicies={policies}
          availableRoles={roles}
          onSubmit={handleCreateToken}
          onCancel={() => setShowCreateModal(false)}
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
        onClose={() => setDeletingToken(null)}
        onConfirm={handleDeleteToken}
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
