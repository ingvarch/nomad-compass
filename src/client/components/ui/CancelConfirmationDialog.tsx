import { Modal } from './Modal';

interface CancelConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}

export function CancelConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
}: CancelConfirmationDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Are you sure you want to cancel? All unsaved changes will be lost.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Stay
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
        >
          Discard
        </button>
      </div>
    </Modal>
  );
}
