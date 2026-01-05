import React from 'react';

interface ExpandIconProps {
  isExpanded: boolean;
  className?: string;
}

export const ExpandIcon: React.FC<ExpandIconProps> = ({ isExpanded, className = '' }) => {
  return (
    <svg
      className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'transform rotate-90' : ''} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export default ExpandIcon;
