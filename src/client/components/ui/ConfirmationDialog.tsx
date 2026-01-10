import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

type DialogMode = 'delete' | 'discard' | 'confirm';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  mode?: DialogMode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

const modeConfig: Record<DialogMode, { variant: 'danger' | 'primary'; defaultConfirm: string }> = {
  delete: { variant: 'danger', defaultConfirm: 'Delete' },
  discard: { variant: 'danger', defaultConfirm: 'Discard' },
  confirm: { variant: 'primary', defaultConfirm: 'Confirm' },
};

/**
 * Unified confirmation dialog for delete, discard, and generic confirm actions.
 * Replaces CancelConfirmationDialog and DeleteConfirmationModal.
 */
export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  mode = 'confirm',
  confirmLabel,
  cancelLabel = 'Cancel',
  isLoading = false,
}: ConfirmationDialogProps) {
  const config = modeConfig[mode];
  const finalConfirmLabel = confirmLabel || config.defaultConfirm;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="text-gray-700 dark:text-gray-300">{message}</div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={config.variant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {finalConfirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
