import React from 'react';

type InfoBoxType = 'info' | 'warning' | 'error' | 'success';

interface InfoBoxProps {
  title?: string;
  children: React.ReactNode;
  type?: InfoBoxType;
  className?: string;
}

const typeStyles: Record<InfoBoxType, string> = {
  info: 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-monokai-surface dark:border-monokai-blue dark:text-monokai-blue',
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-700 dark:bg-monokai-surface dark:border-monokai-yellow dark:text-monokai-yellow',
  error: 'bg-red-50 border-red-400 text-red-700 dark:bg-monokai-surface dark:border-monokai-red dark:text-monokai-red',
  success: 'bg-green-50 border-green-400 text-green-700 dark:bg-monokai-surface dark:border-monokai-green dark:text-monokai-green',
};

export const InfoBox: React.FC<InfoBoxProps> = ({
  title,
  children,
  type = 'info',
  className = '',
}) => {
  return (
    <div className={`p-3 border-l-4 rounded mb-4 ${typeStyles[type]} ${className}`}>
      {title && <h5 className="font-semibold text-sm">{title}</h5>}
      <div className="text-xs mt-1 infobox-content">{children}</div>
    </div>
  );
};

export default InfoBox;
