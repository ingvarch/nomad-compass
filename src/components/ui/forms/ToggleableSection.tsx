import React, { useState } from 'react';
import { ChevronRight, Trash } from 'lucide-react';

interface ToggleableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  isRemovable?: boolean;
  onRemove?: () => void;
  isPrimary?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const ToggleableSection: React.FC<ToggleableSectionProps> = ({
  title,
  children,
  defaultExpanded = true,
  isRemovable = false,
  onRemove,
  isPrimary = false,
  isLoading = false,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(!defaultExpanded);

  return (
    <div className={`border rounded-lg p-4 bg-gray-50 relative ${className}`}>
      {/* Header with collapse/expand button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <ChevronRight
              className={`h-5 w-5 transition-transform ${isCollapsed ? '' : 'transform rotate-90'}`}
            />
          </button>
          <h4 className="text-lg font-medium text-gray-900">
            {title}
            {isPrimary && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Primary</span>}
          </h4>
        </div>

        {isRemovable && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-800 focus:outline-none"
            disabled={isLoading}
          >
            <Trash className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Collapsed/Expanded content */}
      <div className={`transition-all duration-200 overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0 invisible' : 'max-h-full opacity-100 visible'}`}>
        {children}
      </div>
    </div>
  );
};

export default ToggleableSection; 