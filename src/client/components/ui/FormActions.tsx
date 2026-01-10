import React from 'react';

interface FormActionsProps {
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Variant for different button styles */
  variant?: 'default' | 'danger';
}

/**
 * Standard form action buttons (Cancel + Submit)
 * Used across all form modals for consistent styling
 */
export function FormActions({
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  disabled = false,
  className = '',
  variant = 'default',
}: FormActionsProps) {
  const submitButtonClasses = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

  return (
    <div className={`flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={isSubmitting || disabled}
        className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${submitButtonClasses}`}
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}
