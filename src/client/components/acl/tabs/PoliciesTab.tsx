import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { createNomadClient } from '../../../lib/api/nomad';
import { NomadAclPolicyListItem, NomadAclPolicy } from '../../../types/acl';
import { LoadingSpinner, ErrorAlert, RefreshButton, Modal, Button, ConfirmationDialog } from '../../ui';
import { EditButton, DeleteButton } from '../../ui/IconButton';
import { PolicyForm } from '../policy/PolicyForm';
import { useToast } from '../../../context/ToastContext';
import { getErrorMessage } from '../../../lib/errors';

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
      setError(getErrorMessage(err, 'Failed to fetch policies'));
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
      addToast(getErrorMessage(err, 'Failed to delete policy'), 'error');
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
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Policy
            </Button>
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

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deletingPolicy !== null}
        onClose={() => setDeletingPolicy(null)}
        onConfirm={handleDeletePolicy}
        title="Delete Policy"
        message={
          <>
            Are you sure you want to delete the policy{' '}
            <strong className="text-gray-900 dark:text-white">{deletingPolicy?.Name}</strong>?
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              This action cannot be undone. Any tokens or roles using this policy will lose the associated permissions.
            </p>
          </>
        }
        mode="delete"
        confirmLabel="Delete Policy"
        isLoading={deleteLoading}
      />
    </div>
  );
}
