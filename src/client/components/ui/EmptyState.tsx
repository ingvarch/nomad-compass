import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  title?: string;
  className?: string;
}

function EmptyState({ message, icon, title, className = '' }: EmptyStateProps) {
  return (
    <div className={`px-4 py-8 text-center ${className}`}>
      {icon && <div className="mb-2">{icon}</div>}
      {title && (
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      )}
      <p className="text-gray-500 dark:text-gray-400 mt-1">{message}</p>
    </div>
  );
}

export default EmptyState;
