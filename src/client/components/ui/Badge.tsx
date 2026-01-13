import React from 'react';
import { badgeColors, type BadgeColorVariant } from './badgeColors';

type BadgeSize = 'xs' | 'sm';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeColorVariant;
  size?: BadgeSize;
  children: React.ReactNode;
}

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
  const colors = badgeColors[variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded ${colors.bg} ${colors.text} ${sizeClasses[size]} ${className}`.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </span>
  );
}
