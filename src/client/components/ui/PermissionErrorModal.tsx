import React from 'react';
import { ShieldX, X } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-monokai-bg rounded-lg shadow-xl max-w-md w-full transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-monokai-muted dark:hover:text-monokai-text"
          >
            <X size={20} />
          </button>

          {/* Content */}
          <div className="p-6">
            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>

            {/* Title */}
            <h3 className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-monokai-text">
              {title}
            </h3>

            {/* Message */}
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-monokai-muted">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionErrorModal;
