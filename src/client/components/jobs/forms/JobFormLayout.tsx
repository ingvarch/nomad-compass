import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../ui';

interface JobFormLayoutProps {
  title: string;
  error?: string;
  success?: string;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  submitButtonText: string;
  children: ReactNode;
  cancelHref?: string;
  onCancel?: () => void;
  onPlan?: () => void;
  isPlanning?: boolean;
}

const JobFormLayout: React.FC<JobFormLayoutProps> = ({
  title,
  error,
  success,
  isLoading,
  onSubmit,
  submitButtonText,
  children,
  cancelHref,
  onCancel,
  onPlan,
  isPlanning,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h2>

        {error && <ErrorAlert message={error} className="mb-4" />}

        {success && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-sm">
            {success}
          </div>
        )}

        <form onSubmit={onSubmit}>
          {children}

          {/* Spacer so sticky mobile actions bar does not obscure content */}
          <div className="h-16 sm:h-0" />

          {/* Action Buttons: sticky on mobile, static on desktop */}
          <div className="fixed bottom-16 left-0 right-0 z-20 sm:static sm:z-auto bg-white/95 dark:bg-monokai-bg/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-gray-200 dark:border-monokai-surface sm:border-0 p-3 sm:p-0 flex items-center justify-between shadow-lg sm:shadow-none">
            <div className="flex gap-2">
              {onPlan && (
                <button
                  type="button"
                  onClick={onPlan}
                  className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors border ${
                    isPlanning || isLoading
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed border-gray-300 dark:border-gray-600'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/40'
                  }`}
                  disabled={isPlanning || isLoading}
                >
                  {isPlanning ? 'Planning...' : 'Plan'}
                </button>
              )}
              <button
                type="submit"
                className={`py-2 px-4 text-xs sm:text-sm text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : submitButtonText}
              </button>
            </div>

            {cancelHref ? (
              <Link
                to={cancelHref}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
            ) : onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobFormLayout; 