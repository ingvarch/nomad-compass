import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { createNomadClient } from '../../../lib/api/nomad';
import { NomadAclRoleListItem, NomadAclRole, NomadAclPolicyListItem } from '../../../types/acl';
import { LoadingSpinner, ErrorAlert, RefreshButton, Modal, Button, ConfirmationDialog } from '../../ui';
import { EditButton, DeleteButton } from '../../ui/IconButton';
import { RoleForm } from '../role/RoleForm';
import { useCrudTab } from '../../../hooks/useCrudTab';
import {
  tableStyles,
  tableHeaderStyles,
  tableHeaderCellStyles,
  tableBodyStyles,
  tableRowHoverStyles,
} from '../../../lib/styles';

interface RolesTabProps {
  hasManagementAccess: boolean;
}

export function RolesTab({ hasManagementAccess }: RolesTabProps) {
  const [policies, setPolicies] = useState<NomadAclPolicyListItem[]>([]);

  const fetchData = useCallback(async () => {
    const client = createNomadClient();
    const [rolesData, policiesData] = await Promise.all([client.getAclRoles(), client.getAclPolicies()]);
    setPolicies(policiesData || []);
    return rolesData || [];
  }, []);

  const deleteRole = useCallback(async (role: NomadAclRole | NomadAclRoleListItem) => {
    const client = createNomadClient();
    await client.deleteAclRole(role.ID);
  }, []);

  const {
    items: roles,
    loading,
    error,
    showCreateModal,
    editingItem: editingRole,
    deletingItem: deletingRole,
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
  } = useCrudTab<NomadAclRoleListItem, void, NomadAclRole | NomadAclRoleListItem>({
    fetchData,
    deleteItem: deleteRole,
    getDeletedItemName: (role) => `Role "${role.Name}"`,
    fetchErrorMessage: 'Failed to fetch roles',
    deleteErrorMessage: 'Failed to delete role',
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleEditClick = async (role: NomadAclRoleListItem) => {
    const client = createNomadClient();
    try {
      const fullRole = await client.getAclRole(role.ID);
      openEditModal(fullRole);
    } catch {
      openEditModal({
        ID: role.ID,
        Name: role.Name,
        Description: role.Description,
        Policies: role.Policies,
      });
    }
  };

  const handleCreateRole = async (name: string, description: string, policyNames: string[]) => {
    const client = createNomadClient();
    await client.createAclRole({
      Name: name,
      Description: description || undefined,
      Policies: policyNames.map((p) => ({ Name: p })),
    });
    await onCreateSuccess(`Role "${name}" created successfully`);
  };

  const handleUpdateRole = async (name: string, description: string, policyNames: string[]) => {
    if (!editingRole || !('ID' in editingRole)) return;

    const client = createNomadClient();
    await client.updateAclRole(editingRole.ID, {
      ID: editingRole.ID,
      Name: name,
      Description: description || undefined,
      Policies: policyNames.map((p) => ({ Name: p })),
    });
    await onEditSuccess(`Role "${name}" updated successfully`);
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">ACL Roles</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {roles.length} role{roles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {hasManagementAccess && (
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          )}
          <RefreshButton onClick={refetch} />
        </div>
      </div>

      {/* Error */}
      {error && <ErrorAlert message={error} variant="bar" />}

      {/* Table */}
      {roles.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
          No roles found.{' '}
          {hasManagementAccess && (
            <button onClick={openCreateModal} className="text-blue-600 dark:text-blue-400 hover:underline">
              Create your first role
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
                <th className={tableHeaderCellStyles}>Policies</th>
                {hasManagementAccess && <th className={`${tableHeaderCellStyles} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody className={tableBodyStyles}>
              {roles.map((role) => (
                <tr key={role.ID} className={tableRowHoverStyles}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{role.Name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{role.Description || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {role.Policies?.map((p) => (
                        <span
                          key={p.Name}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                        >
                          {p.Name}
                        </span>
                      ))}
                      {(!role.Policies || role.Policies.length === 0) && (
                        <span className="text-sm text-gray-400">No policies</span>
                      )}
                    </div>
                  </td>
                  {hasManagementAccess && (
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <EditButton onClick={() => handleEditClick(role)} title="Edit role" />
                        <DeleteButton onClick={() => openDeleteConfirm(role)} title="Delete role" />
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
      <Modal isOpen={showCreateModal} onClose={closeCreateModal} title="Create Role" size="lg">
        <RoleForm mode="create" availablePolicies={policies} onSubmit={handleCreateRole} onCancel={closeCreateModal} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editingRole !== null} onClose={closeEditModal} title="Edit Role" size="lg">
        {editingRole && 'ID' in editingRole && (
          <RoleForm
            mode="edit"
            role={editingRole}
            availablePolicies={policies}
            onSubmit={handleUpdateRole}
            onCancel={closeEditModal}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deletingRole !== null}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Role"
        message={
          <>
            Are you sure you want to delete the role{' '}
            <strong className="text-gray-900 dark:text-white">{deletingRole?.Name}</strong>?
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              This action cannot be undone. Any tokens using this role will lose the associated permissions.
            </p>
          </>
        }
        mode="delete"
        confirmLabel="Delete Role"
        isLoading={deleteLoading}
      />
    </div>
  );
}
