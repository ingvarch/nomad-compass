import React, { useState, useCallback } from 'react';

interface RefreshButtonProps {
  onClick: () => void;
  className?: string;
  cooldownMs?: number;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  className = '',
  cooldownMs = 2000,
}) => {
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  const handleClick = useCallback(() => {
    if (isOnCooldown) return;

    setIsOnCooldown(true);
    onClick();

    setTimeout(() => {
      setIsOnCooldown(false);
    }, cooldownMs);
  }, [onClick, cooldownMs, isOnCooldown]);

  return (
    <button
      onClick={handleClick}
      disabled={isOnCooldown}
      className={`inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${className}`}
    >
      <svg
        className={`w-4 h-4 mr-2 ${isOnCooldown ? 'animate-spin' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {isOnCooldown ? 'Refreshing...' : 'Refresh'}
    </button>
  );
};
