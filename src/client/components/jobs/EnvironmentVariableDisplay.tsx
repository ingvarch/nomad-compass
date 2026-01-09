import React, { useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';

interface EnvironmentVariableDisplayProps {
    envVars: Record<string, string>;
}

export const EnvironmentVariableDisplay: React.FC<EnvironmentVariableDisplayProps> = ({ envVars }) => {
    const [revealedVars, setRevealedVars] = useState<Record<string, boolean>>({});
    const [copySuccess, setCopySuccess] = useState<string | null>(null);

    // Toggle visibility of a specific variable
    const toggleVariableVisibility = (key: string) => {
        setRevealedVars(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Copy variable to clipboard
    const copyToClipboard = (value: string, key: string) => {
        navigator.clipboard.writeText(value)
            .then(() => {
                setCopySuccess(key);
                setTimeout(() => setCopySuccess(null), 2000);
            })
            .catch(() => {
                // Clipboard API not available or permission denied
            });
    };

    if (!envVars || Object.keys(envVars).length === 0) {
        return <p className="text-sm text-gray-500">No environment variables defined</p>;
    }

    return (
        <div className="grid grid-cols-1 gap-2">
            {Object.entries(envVars).map(([key, value]) => (
                <div
                    key={key}
                    className="flex items-center bg-gray-50 p-2 rounded-md border border-gray-200"
                >
                    <div className="flex-grow mr-2">
                        <div className="font-medium text-sm text-gray-700">{key}</div>
                        <div className="text-sm text-gray-500 font-mono">
                            {revealedVars[key] ? value : '••••••••••••••••'}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => toggleVariableVisibility(key)}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none p-1 rounded-md hover:bg-gray-100"
                            title={revealedVars[key] ? 'Hide value' : 'Show value'}
                        >
                            {revealedVars[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                            onClick={() => copyToClipboard(value, key)}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none p-1 rounded-md hover:bg-gray-100"
                            title="Copy to clipboard"
                        >
                            <Copy size={16} />
                            {copySuccess === key && (
                                <span className="absolute -ml-8 -mt-8 bg-black text-white text-xs px-2 py-1 rounded opacity-80">
                                    Copied!
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EnvironmentVariableDisplay;
