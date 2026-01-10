import { useState, useEffect, useCallback } from 'react';
import { createNomadClient } from '../../../lib/api/nomad';
import { NomadAclPolicyListItem, NomadAclPolicy } from '../../../types/acl';
import { LoadingSpinner, ErrorAlert, RefreshButton, Modal, DeleteConfirmationModal } from '../../ui';
import { EditButton, DeleteButton } from '../../ui/IconButton';
import { PolicyForm } from '../policy/PolicyForm';
import { useToast } from '../../../context/ToastContext';

interface PoliciesTabProps {
  hasManagementAccess: boolean;
}

export function PoliciesTab({ hasManagementAccess }: PoliciesTabProps) {
  const [policies, setPolicies] = useState<NomadAclPolicyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<NomadAclPolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<NomadAclPolicyListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { addToast } = useToast();

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);

    const client = createNomadClient();
    try {
      const data = await client.getAclPolicies();
      setPolicies(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch policies';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleEditClick = async (policy: NomadAclPolicyListItem) => {
    const client = createNomadClient();
    try {
      const fullPolicy = await client.getAclPolicy(policy.Name);
      setEditingPolicy(fullPolicy);
    } catch {
      // Fallback to basic info
      setEditingPolicy({
        Name: policy.Name,
        Description: policy.Description,
        Rules: '',
      });
    }
  };

  const handleCreatePolicy = async (name: string, description: string, rules: string) => {
    const client = createNomadClient();
    await client.createAclPolicy(name, description, rules);
    addToast(`Policy "${name}" created successfully`, 'success');
    setShowCreateModal(false);
    await fetchPolicies();
  };

  const handleUpdatePolicy = async (name: string, description: string, rules: string) => {
    const client = createNomadClient();
    await client.updateAclPolicy(name, description, rules);
    addToast(`Policy "${name}" updated successfully`, 'success');
    setEditingPolicy(null);
    await fetchPolicies();
  };

  const handleDeletePolicy = async () => {
    if (!deletingPolicy) return;

    setDeleteLoading(true);
    const client = createNomadClient();
    try {
      await client.deleteAclPolicy(deletingPolicy.Name);
      addToast(`Policy "${deletingPolicy.Name}" deleted successfully`, 'success');
      setDeletingPolicy(null);
      await fetchPolicies();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete policy';
      addToast(message, 'error');
    } finally {
      setDeleteLoading(false);
    }
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
            ACL Policies
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {policies.length} policy{policies.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <div className="flex gap-2">
          {hasManagementAccess && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Policy
            </button>
          )}
          <RefreshButton onClick={() => fetchPolicies()} />
        </div>
      </div>

      {/* Error */}
      {error && <ErrorAlert message={error} variant="bar" />}

      {/* Table */}
      {policies.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
          No policies found.{' '}
          {hasManagementAccess && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create your first policy
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
                  Description
                </th>
                {hasManagementAccess && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {policies.map((policy) => (
                <tr
                  key={policy.Name}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {policy.Name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {policy.Description || '-'}
                    </span>
                  </td>
                  {hasManagementAccess && (
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <EditButton
                          onClick={() => handleEditClick(policy)}
                          title="Edit policy"
                        />
                        <DeleteButton
                          onClick={() => setDeletingPolicy(policy)}
                          title="Delete policy"
                        />
                      </div>
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
        title="Create Policy"
        size="2xl"
      >
        <PolicyForm
          mode="create"
          onSubmit={handleCreatePolicy}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editingPolicy !== null}
        onClose={() => setEditingPolicy(null)}
        title="Edit Policy"
        size="2xl"
      >
        {editingPolicy && (
          <PolicyForm
            mode="edit"
            policy={editingPolicy}
            onSubmit={handleUpdatePolicy}
            onCancel={() => setEditingPolicy(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deletingPolicy !== null}
        onClose={() => setDeletingPolicy(null)}
        onConfirm={handleDeletePolicy}
        title="Delete Policy"
        itemName={deletingPolicy?.Name || ''}
        itemType="policy"
        warningText="This action cannot be undone. Any tokens or roles using this policy will lose the associated permissions."
        isLoading={deleteLoading}
      />
    </div>
  );
}
