import { useState } from 'react';
import { NomadAclToken } from '../../../types/acl';

interface SecretIdDisplayProps {
  token: NomadAclToken;
  onClose: () => void;
}

export function SecretIdDisplay({ token, onClose }: SecretIdDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (token.SecretID) {
      try {
        await navigator.clipboard.writeText(token.SecretID);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = token.SecretID;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Save this Secret ID now
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              This is the only time you can view the Secret ID. Store it securely.
            </p>
          </div>
        </div>
      </div>

      {/* Token Info */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
            Name
          </label>
          <p className="text-sm text-gray-900 dark:text-white">{token.Name || 'Unnamed'}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
            Accessor ID
          </label>
          <code className="text-sm text-gray-900 dark:text-white font-mono break-all">
            {token.AccessorID}
          </code>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
            Secret ID
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-gray-900 dark:text-white font-mono bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 break-all">
              {token.SecretID}
            </code>
            <button
              onClick={handleCopy}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                copied
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
              }`}
            >
              {copied ? (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Copied
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </span>
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
            Type
          </label>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              token.Type === 'management'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            }`}
          >
            {token.Type}
          </span>
        </div>
      </div>

      {/* Close Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          I've saved the Secret ID
        </button>
      </div>
    </div>
  );
}
