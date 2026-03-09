import React from 'react';
import { Link } from 'react-router-dom';
import { buttonSecondaryStyles } from '../../lib/styles';

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
      className={`${buttonSecondaryStyles} shadow-sm ${className}`}
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
