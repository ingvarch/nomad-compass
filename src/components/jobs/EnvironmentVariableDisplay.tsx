import React, { useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';

interface EnvironmentVariableDisplayProps {
    envVars: Record<string, string>;
}

export const EnvironmentVariableDisplay: React.FC<EnvironmentVariableDisplayProps> = ({ envVars }) => {
    const [revealedVars, setRevealedVars] = useState<Record<string, boolean>>({});

    // Toggle visibility of a specific variable
    const toggleVariableVisibility = (key: string) => {
        setRevealedVars(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Copy variable to clipboard
    const copyToClipboard = (value: string) => {
        navigator.clipboard.writeText(value).then(() => {
            // Optional: show a tooltip or temporary feedback
            alert('Copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    };

    return (
        <div className="grid grid-cols-1 gap-2">
            {Object.entries(envVars).map(([key, value]) => (
                <div
                    key={key}
                    className="flex items-center bg-gray-50 p-2 rounded-md border border-gray-200"
                >
                    <div className="flex-grow mr-2">
                        <div className="font-medium text-sm text-gray-700">{key}</div>
                        <div className="text-sm text-gray-500">
                            {revealedVars[key] ? value : '*'.repeat(value.length)}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => toggleVariableVisibility(key)}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            title={revealedVars[key] ? 'Hide value' : 'Show value'}
                        >
                            {revealedVars[key] ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <button
                            onClick={() => copyToClipboard(value)}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            title="Copy to clipboard"
                        >
                            <Copy size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EnvironmentVariableDisplay;
