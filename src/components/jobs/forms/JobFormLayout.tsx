import React, { ReactNode } from 'react';
import Link from 'next/link';

interface JobFormLayoutProps {
  title: string;
  error?: string;
  success?: string;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  submitButtonText: string;
  children: ReactNode;
  cancelHref?: string;
}

export const JobFormLayout: React.FC<JobFormLayoutProps> = ({
  title,
  error,
  success,
  isLoading,
  onSubmit,
  submitButtonText,
  children,
  cancelHref
}) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
            {success}
          </div>
        )}

        <form onSubmit={onSubmit}>
          {children}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              type="submit"
              className={`py-2 px-4 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : submitButtonText}
            </button>

            {cancelHref && (
              <Link
                href={cancelHref}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobFormLayout; 