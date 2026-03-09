import { useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { createNomadClient } from '../../../lib/api/nomad';
import { NomadAclPolicyListItem, NomadAclPolicy } from '../../../types/acl';
import { LoadingSpinner, ErrorAlert, RefreshButton, Modal, Button, ConfirmationDialog } from '../../ui';
import { EditButton, DeleteButton } from '../../ui/IconButton';
import { PolicyForm } from '../policy/PolicyForm';
import { useCrudTab } from '../../../hooks/useCrudTab';
import {
  tableStyles,
  tableHeaderStyles,
  tableHeaderCellStyles,
  tableBodyStyles,
  tableRowHoverStyles,
} from '../../../lib/styles';

interface PoliciesTabProps {
  hasManagementAccess: boolean;
}

export function PoliciesTab({ hasManagementAccess }: PoliciesTabProps) {
  const fetchPolicies = useCallback(async () => {
    const client = createNomadClient();
    return client.getAclPolicies();
  }, []);

  const deletePolicy = useCallback(async (policy: NomadAclPolicy | NomadAclPolicyListItem) => {
    const client = createNomadClient();
    await client.deleteAclPolicy(policy.Name);
  }, []);

  const {
    items: policies,
    loading,
    error,
    showCreateModal,
    editingItem: editingPolicy,
    deletingItem: deletingPolicy,
    deleteLoading,
    refetch,
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    onCreateSuccess,
    onEditSuccess,
  } = useCrudTab<NomadAclPolicyListItem, NomadAclPolicy | NomadAclPolicyListItem>({
    fetchData: fetchPolicies,
    deleteItem: deletePolicy,
    getDeletedItemName: (policy) => `Policy "${policy.Name}"`,
    fetchErrorMessage: 'Failed to fetch policies',
    deleteErrorMessage: 'Failed to delete policy',
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleEditClick = async (policy: NomadAclPolicyListItem) => {
    const client = createNomadClient();
    try {
      const fullPolicy = await client.getAclPolicy(policy.Name);
      openEditModal(fullPolicy);
    } catch {
      openEditModal({
        Name: policy.Name,
        Description: policy.Description,
        Rules: '',
      });
    }
  };

  const handleCreatePolicy = async (name: string, description: string, rules: string) => {
    const client = createNomadClient();
    await client.createAclPolicy(name, description, rules);
    await onCreateSuccess(`Policy "${name}" created successfully`);
  };

  const handleUpdatePolicy = async (name: string, description: string, rules: string) => {
    const client = createNomadClient();
    await client.updateAclPolicy(name, description, rules);
    await onEditSuccess(`Policy "${name}" updated successfully`);
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">ACL Policies</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {policies.length} policy{policies.length !== 1 ? 'ies' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {hasManagementAccess && (
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Create Policy
            </Button>
          )}
          <RefreshButton onClick={refetch} />
        </div>
      </div>

      {/* Error */}
      {error && <ErrorAlert message={error} variant="bar" />}

      {/* Table */}
      {policies.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
          No policies found.{' '}
          {hasManagementAccess && (
            <button onClick={openCreateModal} className="text-blue-600 dark:text-blue-400 hover:underline">
              Create your first policy
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={tableStyles}>
            <thead className={tableHeaderStyles}>
              <tr>
                <th className={tableHeaderCellStyles}>Name</th>
                <th className={tableHeaderCellStyles}>Description</th>
                {hasManagementAccess && <th className={`${tableHeaderCellStyles} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody className={tableBodyStyles}>
              {policies.map((policy) => (
                <tr key={policy.Name} className={tableRowHoverStyles}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{policy.Name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{policy.Description || '-'}</span>
                  </td>
                  {hasManagementAccess && (
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <EditButton onClick={() => handleEditClick(policy)} title="Edit policy" />
                        <DeleteButton onClick={() => openDeleteConfirm(policy)} title="Delete policy" />
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
      <Modal isOpen={showCreateModal} onClose={closeCreateModal} title="Create Policy" size="2xl">
        <PolicyForm mode="create" onSubmit={handleCreatePolicy} onCancel={closeCreateModal} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editingPolicy !== null} onClose={closeEditModal} title="Edit Policy" size="2xl">
        {editingPolicy && 'Rules' in editingPolicy && (
          <PolicyForm mode="edit" policy={editingPolicy} onSubmit={handleUpdatePolicy} onCancel={closeEditModal} />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deletingPolicy !== null}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
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
