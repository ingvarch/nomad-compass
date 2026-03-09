import { Button } from './Button';

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
  return (
    <div className={`flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 ${className}`}>
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        variant={variant === 'danger' ? 'danger' : 'primary'}
        disabled={disabled}
        isLoading={isSubmitting}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
