import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface VisibilityToggleButtonProps {
    isVisible: boolean;
    onToggle: () => void;
    disabled?: boolean;
    size?: number;
    className?: string;
}

/**
 * Button component for toggling visibility of sensitive content (passwords, secrets, etc.).
 * Renders Eye icon when hidden, EyeOff icon when visible.
 */
export const VisibilityToggleButton: React.FC<VisibilityToggleButtonProps> = ({
    isVisible,
    onToggle,
    disabled = false,
    size = 16,
    className = ''
}) => {
    const baseClasses = 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';

    return (
        <button
            type="button"
            onClick={onToggle}
            className={`${baseClasses} ${className}`}
            disabled={disabled}
            title={isVisible ? 'Hide value' : 'Show value'}
            aria-label={isVisible ? 'Hide value' : 'Show value'}
        >
            {isVisible ? <EyeOff size={size} /> : <Eye size={size} />}
        </button>
    );
};
