'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export const DashboardNav: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { logout, nomadAddr } = useAuth();

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <nav className="bg-white dark:bg-monokai-bg shadow-sm border-b border-gray-200 dark:border-monokai-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-blue-600 dark:text-monokai-blue font-bold text-xl">Nomad Compass</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/dashboard')
                    ? 'border-blue-500 text-gray-900 dark:border-monokai-blue dark:text-monokai-text'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-monokai-muted dark:hover:border-monokai-surface dark:hover:text-monokai-text'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/jobs"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/jobs')
                    ? 'border-blue-500 text-gray-900 dark:border-monokai-blue dark:text-monokai-text'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-monokai-muted dark:hover:border-monokai-surface dark:hover:text-monokai-text'
                }`}
              >
                Jobs
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative">
              <div className="flex items-center space-x-3">
                {nomadAddr && (
                  <span className="text-sm text-gray-500 dark:text-monokai-muted hidden md:inline-block">
                    {nomadAddr}
                  </span>
                )}
                <ThemeToggle />
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-monokai-red dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-monokai-bg"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <ThemeToggle className="mr-2" />
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:text-monokai-muted dark:hover:text-monokai-text dark:hover:bg-monokai-surface focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Icon when menu is open */}
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} sm:hidden`} id="mobile-menu">
        <div className="pt-2 pb-3 space-y-1">
          <Link
            href="/dashboard"
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActive('/dashboard')
                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-monokai-surface dark:border-monokai-blue dark:text-monokai-blue'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 dark:text-monokai-muted dark:hover:bg-monokai-surface dark:hover:border-monokai-surface dark:hover:text-monokai-text'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/jobs"
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActive('/jobs')
                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-monokai-surface dark:border-monokai-blue dark:text-monokai-blue'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 dark:text-monokai-muted dark:hover:bg-monokai-surface dark:hover:border-monokai-surface dark:hover:text-monokai-text'
            }`}
          >
            Jobs
          </Link>
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200 dark:border-monokai-surface">
          <div className="flex items-center px-4">
            <div className="ml-3">
              {nomadAddr && (
                <div className="text-sm font-medium text-gray-500 dark:text-monokai-muted">
                  {nomadAddr}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <button
              onClick={logout}
              className="block w-full text-left px-4 py-2 text-base font-medium text-red-600 hover:bg-gray-100 dark:text-monokai-red dark:hover:bg-monokai-surface"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNav;