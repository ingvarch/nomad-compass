import { useState, useEffect, useCallback } from 'react';
import { createNomadClient } from '../../../lib/api/nomad';
import {
  NomadAclRoleListItem,
  NomadAclRole,
  NomadAclPolicyListItem,
} from '../../../types/acl';
import { LoadingSpinner, ErrorAlert, RefreshButton, Modal, DeleteConfirmationModal } from '../../ui';
import { EditButton, DeleteButton } from '../../ui/IconButton';
import { RoleForm } from '../role/RoleForm';
import { useToast } from '../../../context/ToastContext';

interface RolesTabProps {
  hasManagementAccess: boolean;
}

export function RolesTab({ hasManagementAccess }: RolesTabProps) {
  const [roles, setRoles] = useState<NomadAclRoleListItem[]>([]);
  const [policies, setPolicies] = useState<NomadAclPolicyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<NomadAclRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<NomadAclRoleListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const client = createNomadClient();
    try {
      const [rolesData, policiesData] = await Promise.all([
        client.getAclRoles(),
        client.getAclPolicies(),
      ]);
      setRoles(rolesData || []);
      setPolicies(policiesData || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch roles';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditClick = async (role: NomadAclRoleListItem) => {
    const client = createNomadClient();
    try {
      const fullRole = await client.getAclRole(role.ID);
      setEditingRole(fullRole);
    } catch {
      // Fallback to basic info
      setEditingRole({
        ID: role.ID,
        Name: role.Name,
        Description: role.Description,
        Policies: role.Policies,
      });
    }
  };

  const handleCreateRole = async (
    name: string,
    description: string,
    policyNames: string[]
  ) => {
    const client = createNomadClient();
    await client.createAclRole({
      Name: name,
      Description: description || undefined,
      Policies: policyNames.map((p) => ({ Name: p })),
    });
    addToast(`Role "${name}" created successfully`, 'success');
    setShowCreateModal(false);
    await fetchData();
  };

  const handleUpdateRole = async (
    name: string,
    description: string,
    policyNames: string[]
  ) => {
    if (!editingRole) return;

    const client = createNomadClient();
    await client.updateAclRole(editingRole.ID, {
      ID: editingRole.ID,
      Name: name,
      Description: description || undefined,
      Policies: policyNames.map((p) => ({ Name: p })),
    });
    addToast(`Role "${name}" updated successfully`, 'success');
    setEditingRole(null);
    await fetchData();
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;

    setDeleteLoading(true);
    const client = createNomadClient();
    try {
      await client.deleteAclRole(deletingRole.ID);
      addToast(`Role "${deletingRole.Name}" deleted successfully`, 'success');
      setDeletingRole(null);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete role';
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">ACL Roles</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {roles.length} role{roles.length !== 1 ? 's' : ''}
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
              Create Role
            </button>
          )}
          <RefreshButton onClick={() => fetchData()} />
        </div>
      </div>

      {/* Error */}
      {error && <ErrorAlert message={error} variant="bar" />}

      {/* Table */}
      {roles.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
          No roles found.{' '}
          {hasManagementAccess && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create your first role
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Policies
                </th>
                {hasManagementAccess && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {roles.map((role) => (
                <tr
                  key={role.ID}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {role.Name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {role.Description || '-'}
                    </span>
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
                        <EditButton
                          onClick={() => handleEditClick(role)}
                          title="Edit role"
                        />
                        <DeleteButton
                          onClick={() => setDeletingRole(role)}
                          title="Delete role"
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
        title="Create Role"
        size="lg"
      >
        <RoleForm
          mode="create"
          availablePolicies={policies}
          onSubmit={handleCreateRole}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editingRole !== null}
        onClose={() => setEditingRole(null)}
        title="Edit Role"
        size="lg"
      >
        {editingRole && (
          <RoleForm
            mode="edit"
            role={editingRole}
            availablePolicies={policies}
            onSubmit={handleUpdateRole}
            onCancel={() => setEditingRole(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deletingRole !== null}
        onClose={() => setDeletingRole(null)}
        onConfirm={handleDeleteRole}
        title="Delete Role"
        itemName={deletingRole?.Name || ''}
        itemType="role"
        warningText="This action cannot be undone. Any tokens using this role will lose the associated permissions."
        isLoading={deleteLoading}
      />
    </div>
  );
}
