import React from 'react';

type RemovableBadgeVariant = 'green' | 'red' | 'blue' | 'yellow' | 'gray';

interface RemovableBadgeProps {
  children: React.ReactNode;
  variant?: RemovableBadgeVariant;
  onRemove: () => void;
  className?: string;
}

const variantClasses: Record<RemovableBadgeVariant, { bg: string; text: string; hoverText: string }> = {
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    hoverText: 'hover:text-green-600 dark:hover:text-green-200',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    hoverText: 'hover:text-red-600 dark:hover:text-red-200',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-300',
    hoverText: 'hover:text-blue-600 dark:hover:text-blue-200',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
    hoverText: 'hover:text-yellow-600 dark:hover:text-yellow-200',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-800 dark:text-gray-200',
    hoverText: 'hover:text-gray-600 dark:hover:text-gray-100',
  },
};

export function RemovableBadge({
  children,
  variant = 'gray',
  onRemove,
  className = '',
}: RemovableBadgeProps) {
  const styles = variantClasses[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 ${styles.bg} ${styles.text} text-sm rounded ${className}`.trim()}
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        className={styles.hoverText}
        aria-label="Remove"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}
