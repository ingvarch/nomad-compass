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
      className={`inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 ${className}`}
    >
      <svg
        className="w-4 h-4 mr-1"
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
