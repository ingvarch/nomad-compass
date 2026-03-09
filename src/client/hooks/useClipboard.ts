import { useState, useCallback } from 'react';

/**
 * Hook for copying text to clipboard with fallback support.
 * Returns copied state and copy function.
 *
 * @param timeout - Duration in ms to show "copied" state (default: 2000)
 */
export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
        return true;
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
        return true;
      }
    },
    [timeout]
  );

  return { copied, copy };
}
