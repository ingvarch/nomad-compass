import React, { useState } from 'react';
import { NomadNamespace } from '../../types/nomad';
import { isPermissionError, getPermissionErrorMessage } from '../../lib/api/errors';

interface DeleteNamespaceConfirmProps {
  namespace: NomadNamespace;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const DeleteNamespaceConfirm: React.FC<DeleteNamespaceConfirmProps> = ({
  namespace,
  onConfirm,
  onCancel,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDefaultNamespace = namespace.Name === 'default';
  const canDelete = confirmText === namespace.Name && !isDefaultNamespace;

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
    } catch (err) {
      if (isPermissionError(err)) {
        setError(getPermissionErrorMessage('delete-namespace'));
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete namespace');
      }
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {isDefaultNamespace ? (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-300">
                Cannot delete default namespace
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                The default namespace is required by Nomad and cannot be deleted.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-medium text-red-800 dark:text-red-300">
                  This action cannot be undone
                </p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  Deleting this namespace will remove it permanently. Any jobs in this namespace must be moved or deleted first.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm-name"
              className="block text-sm font-medium text-gray-700 dark:text-monokai-text mb-1"
            >
              Type <span className="font-mono font-bold">{namespace.Name}</span> to confirm
            </label>
            <input
              id="confirm-name"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-monokai-muted rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 bg-white dark:bg-monokai-surface text-gray-900 dark:text-monokai-text"
              placeholder={namespace.Name}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          disabled={isDeleting}
        >
          Cancel
        </button>
        {!isDefaultNamespace && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Namespace'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DeleteNamespaceConfirm;
