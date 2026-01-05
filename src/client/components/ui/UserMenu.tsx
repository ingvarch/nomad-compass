import { useState, useEffect, useRef } from 'react';
import { Menu, ChevronDown, Lock, LockOpen, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface UserMenuProps {
  nomadAddr: string | null;
  onLogout: () => void;
}

function parseNomadAddr(addr: string): { isSecure: boolean; displayAddr: string } {
  const isSecure = addr.startsWith('https://');
  const displayAddr = addr.replace(/^https?:\/\//, '');
  return { isSecure, displayAddr };
}

export function UserMenu({ nomadAddr, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { effectiveTheme, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const parsed = nomadAddr ? parseNomadAddr(nomadAddr) : null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Menu trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-md transition-colors
          text-gray-600 hover:text-gray-900 hover:bg-gray-100
          dark:text-monokai-muted dark:hover:text-monokai-text dark:hover:bg-monokai-surface
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          dark:focus:ring-offset-monokai-bg"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Menu className="h-6 w-6" />
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg shadow-lg
            bg-white dark:bg-monokai-surface
            border border-gray-200 dark:border-monokai-bg
            ring-1 ring-black ring-opacity-5
            z-50"
        >
          {/* Header: Nomad address */}
          {parsed && (
            <div className="px-4 py-3 border-b border-gray-100 dark:border-monokai-bg">
              <div className="flex items-center gap-2">
                {parsed.isSecure ? (
                  <span
                    title="HTTPS: Secure encrypted connection"
                    className="flex-shrink-0 cursor-help"
                  >
                    <Lock className="h-4 w-4 text-green-600 dark:text-green-500" />
                  </span>
                ) : (
                  <span
                    title="HTTP: Unencrypted connection"
                    className="flex-shrink-0 cursor-help"
                  >
                    <LockOpen className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                  </span>
                )}
                <span
                  className="text-sm text-gray-700 dark:text-monokai-text truncate"
                  title={nomadAddr || ''}
                >
                  {parsed.displayAddr}
                </span>
              </div>
            </div>
          )}

          {/* Menu items */}
          <div className="py-1">
            {/* Theme toggle */}
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="w-full flex items-center justify-between px-4 py-2 text-sm
                text-gray-700 dark:text-monokai-text
                hover:bg-gray-50 dark:hover:bg-monokai-bg
                transition-colors"
            >
              <span className="flex items-center gap-2">
                {mounted && effectiveTheme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span>Theme</span>
              </span>
              <span className="text-xs text-gray-500 dark:text-monokai-muted">
                {mounted ? (effectiveTheme === 'dark' ? 'Dark' : 'Light') : '...'}
              </span>
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-gray-100 dark:border-monokai-bg" />

            {/* Sign out */}
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm
                text-red-600 dark:text-monokai-red
                hover:bg-red-50 dark:hover:bg-red-900/20
                transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
