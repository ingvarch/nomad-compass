import React from 'react';

type BadgeVariant = 'blue' | 'purple' | 'green' | 'red' | 'yellow' | 'gray';
type BadgeSize = 'xs' | 'sm';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  gray: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-1 text-sm',
};

export function Badge({
  variant = 'gray',
  size = 'xs',
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </span>
  );
}
