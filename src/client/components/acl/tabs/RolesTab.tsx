import { useState, useEffect, useCallback } from 'react';
import { createNomadClient } from '../../../lib/api/nomad';
import {
  NomadAclRoleListItem,
  NomadAclRole,
  NomadAclPolicyListItem,
} from '../../../types/acl';
import { LoadingSpinner } from '../../ui';
import { Modal } from '../../ui/Modal';
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
          <button
            onClick={() => fetchData()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

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
                        <button
                          onClick={() => handleEditClick(role)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Edit role"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletingRole(role)}
                          className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Delete role"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
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
      <Modal
        isOpen={deletingRole !== null}
        onClose={() => setDeletingRole(null)}
        title="Delete Role"
      >
        {deletingRole && (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the role{' '}
              <strong className="text-gray-900 dark:text-white">
                {deletingRole.Name}
              </strong>
              ?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone. Any tokens using this role will lose the
              associated permissions.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setDeletingRole(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRole}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Role'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
