import React from 'react';

interface StatusBadgeProps {
  status: string;
  isStopped?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isStopped }) => {
  const getStatusClasses = () => {
    if (status === 'running') {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (status === 'pending') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
    if (isStopped) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200';
    }
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClasses()}`}>
      {status} {isStopped ? '(Stopped)' : ''}
    </span>
  );
};

export default StatusBadge;
