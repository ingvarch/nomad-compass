import React from 'react';

interface ErrorAlertProps {
  message: string;
  title?: string;
  children?: React.ReactNode;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  title = 'Error',
  children,
}) => {
  return (
    <div
      className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative"
      role="alert"
    >
      {title && <strong className="font-bold">{title}: </strong>}
      <span className="block sm:inline">{message}</span>
      {children}
    </div>
  );
};

export default ErrorAlert;
