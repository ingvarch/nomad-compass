import React from 'react';
import { Modal } from './Modal';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemType: string;
  warningText?: string;
  isLoading?: boolean;
}

/**
 * Reusable delete confirmation modal with consistent styling.
 * Used across ACL tabs for policies, roles, and tokens deletion.
 */
export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  warningText = 'This action cannot be undone.',
  isLoading = false,
}: DeleteConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete the {itemType}{' '}
          <strong className="text-gray-900 dark:text-white">{itemName}</strong>?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{warningText}</p>
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
          >
            {isLoading ? 'Deleting...' : `Delete ${itemType}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
