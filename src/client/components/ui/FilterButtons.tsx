import React from 'react';

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  color?: string;
}

interface FilterButtonsProps<T extends string = string> {
  options: FilterOption<T>[];
  activeValue: T;
  onFilterChange: (value: T) => void;
  showCounts?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = {
  sm: 'px-3 py-1 text-xs rounded-full',
  md: 'px-3 py-1.5 text-sm rounded-md',
};

export function FilterButtons<T extends string = string>({
  options,
  activeValue,
  onFilterChange,
  showCounts = true,
  size = 'md',
  className = '',
}: FilterButtonsProps<T>) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onFilterChange(option.value)}
          className={`inline-flex items-center gap-2 font-medium transition-colors ${sizeClasses[size]} ${
            activeValue === option.value
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {option.color && (
            <span className={`w-2 h-2 rounded-full ${option.color}`} />
          )}
          {option.label}
          {showCounts && option.count !== undefined && (
            <span className="text-gray-500 dark:text-gray-400">
              ({option.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
