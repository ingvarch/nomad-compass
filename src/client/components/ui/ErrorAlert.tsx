import React from 'react';

type ErrorAlertVariant = 'default' | 'bar';

interface ErrorAlertProps {
  message: string;
  title?: string;
  showTitle?: boolean;
  variant?: ErrorAlertVariant;
  className?: string;
  children?: React.ReactNode;
}

const variantStyles: Record<ErrorAlertVariant, string> = {
  default: 'border rounded-lg p-4',
  bar: 'border-b px-4 py-3',
};

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  title = 'Error',
  showTitle = false,
  variant = 'default',
  className = '',
  children,
}) => {
  return (
    <div
      className={`bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 ${variantStyles[variant]} ${className}`}
      role="alert"
    >
      {showTitle && title && (
        <strong className="font-bold text-red-800 dark:text-red-200">{title}: </strong>
      )}
      <p className="text-red-800 dark:text-red-200">{message}</p>
      {children}
    </div>
  );
};

export default ErrorAlert;
