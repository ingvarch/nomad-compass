import React from 'react';
import { badgeColors, type BadgeColorVariant } from './badgeColors';

type RemovableBadgeVariant = Exclude<BadgeColorVariant, 'purple'>;

interface RemovableBadgeProps {
  children: React.ReactNode;
  variant?: RemovableBadgeVariant;
  onRemove: () => void;
  className?: string;
}

export function RemovableBadge({
  children,
  variant = 'gray',
  onRemove,
  className = '',
}: RemovableBadgeProps) {
  const colors = badgeColors[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 ${colors.bg} ${colors.text} text-sm rounded ${className}`.trim()}
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        className={colors.hoverText}
        aria-label="Remove"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}
