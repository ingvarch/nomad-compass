import React, { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string | ReactNode;
  actions?: ReactNode;
  className?: string;
  actionsClassName?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className = '',
  actionsClassName = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 ${className}`}>
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className={`flex items-center gap-2 flex-wrap ${actionsClassName}`.trim()}>
          {actions}
        </div>
      )}
    </div>
  );
};
