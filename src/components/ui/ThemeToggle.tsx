'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className={`inline-flex items-center justify-center p-2 rounded-md transition-colors
          text-gray-500 hover:text-gray-700 hover:bg-gray-100
          dark:text-monokai-muted dark:hover:text-monokai-text dark:hover:bg-monokai-surface
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nomad-500
          dark:focus:ring-offset-monokai-bg ${className}`}
        aria-label="Toggle theme"
      >
        <Moon className="h-5 w-5" />
      </button>
    );
  }

  return <ThemeToggleClient className={className} />;
};

const ThemeToggleClient: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center p-2 rounded-md transition-colors
        text-gray-500 hover:text-gray-700 hover:bg-gray-100
        dark:text-monokai-muted dark:hover:text-monokai-text dark:hover:bg-monokai-surface
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nomad-500
        dark:focus:ring-offset-monokai-bg ${className}`}
      aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {effectiveTheme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
};
