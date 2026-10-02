import React, { useState, useCallback } from 'react';
import { buttonSecondaryStyles } from '../../lib/styles';

interface RefreshButtonProps {
  onClick: () => void;
  className?: string;
  cooldownMs?: number;
  iconOnly?: boolean;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  className = '',
  cooldownMs = 2000,
  iconOnly = true,
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

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isOnCooldown}
        title={isOnCooldown ? 'Refreshing...' : 'Refresh'}
        aria-label={isOnCooldown ? 'Refreshing...' : 'Refresh'}
        className={`inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`.trim()}
      >
        <svg
          className={`w-4 h-4 ${isOnCooldown ? 'animate-spin' : ''}`}
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
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isOnCooldown}
      className={`${buttonSecondaryStyles} shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${className}`}
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
