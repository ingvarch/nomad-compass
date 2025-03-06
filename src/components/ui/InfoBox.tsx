import React from 'react';

type InfoBoxType = 'info' | 'warning' | 'error' | 'success';

interface InfoBoxProps {
  title?: string;
  children: React.ReactNode;
  type?: InfoBoxType;
  className?: string;
}

export const InfoBox: React.FC<InfoBoxProps> = ({
  title,
  children,
  type = 'info',
  className = ''
}) => {
  const typeStyles = {
    info: 'bg-blue-50 border-blue-400 text-blue-700',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-700',
    error: 'bg-red-50 border-red-400 text-red-700',
    success: 'bg-green-50 border-green-400 text-green-700'
  };

  const codeStyles = {
    info: 'bg-blue-100',
    warning: 'bg-yellow-100',
    error: 'bg-red-100',
    success: 'bg-green-100'
  };

  return (
    <div className={`p-3 border-l-4 rounded mb-4 ${typeStyles[type]} ${className}`}>
      {title && <h5 className="font-semibold text-sm">{title}</h5>}
      <div className="text-xs mt-1 infobox-content">
        {React.Children.map(children, child => {
          if (typeof child === 'string') {
            // Replace <code>content</code> with styled code element
            return child.split(/(<code>.*?<\/code>)/g).map((part, index) => {
              if (part.startsWith('<code>') && part.endsWith('</code>')) {
                const content = part.slice(6, -7); // Remove <code> and </code>
                return (
                  <code key={index} className={`${codeStyles[type]} px-1 py-0.5 rounded`}>
                    {content}
                  </code>
                );
              }
              return part;
            });
          }
          return child;
        })}
      </div>
    </div>
  );
};

export default InfoBox; 