import React from 'react';
import { ShieldX } from 'lucide-react';
import { Modal } from './Modal';

interface PermissionErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  title?: string;
}

export const PermissionErrorModal: React.FC<PermissionErrorModalProps> = ({
  isOpen,
  onClose,
  message,
  title = 'Permission Denied',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      {/* Icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>

      {/* Message */}
      <p className="mt-4 text-center text-sm text-gray-600 dark:text-monokai-muted">
        {message}
      </p>

      {/* Help text */}
      <p className="mt-4 text-center text-xs text-gray-500 dark:text-monokai-muted/70">
        Contact your administrator if you need access to this operation.
      </p>

      {/* Action button */}
      <div className="mt-6">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-monokai-bg"
        >
          Understood
        </button>
      </div>
    </Modal>
  );
};

export default PermissionErrorModal;
