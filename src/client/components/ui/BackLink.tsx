import React from 'react';
import { Link } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  label?: string;
  className?: string;
}

export const BackLink: React.FC<BackLinkProps> = ({
  to,
  label = 'Back to Dashboard',
  className = '',
}) => {
  return (
    <Link
      to={to}
      className={`inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
    >
      <svg
        className="w-4 h-4 mr-1.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      {label}
    </Link>
  );
};
