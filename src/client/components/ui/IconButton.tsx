import React from 'react';

interface IconButtonProps {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

const baseClasses = 'p-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

/**
 * Base icon button component
 */
export function IconButton({
  onClick,
  title,
  disabled,
  className = '',
  children,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

/**
 * Edit icon button with pencil icon
 */
export function EditButton({
  onClick,
  title = 'Edit',
  disabled,
}: Omit<IconButtonProps, 'children' | 'className'>) {
  return (
    <IconButton
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-gray-700 focus:ring-blue-500"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    </IconButton>
  );
}

/**
 * Delete icon button with trash icon
 */
export function DeleteButton({
  onClick,
  title = 'Delete',
  disabled,
}: Omit<IconButtonProps, 'children' | 'className'>) {
  return (
    <IconButton
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-gray-700 focus:ring-red-500"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </IconButton>
  );
}

/**
 * View icon button with eye icon
 */
export function ViewButton({
  onClick,
  title = 'View',
  disabled,
}: Omit<IconButtonProps, 'children' | 'className'>) {
  return (
    <IconButton
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-gray-700 focus:ring-blue-500"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    </IconButton>
  );
}
