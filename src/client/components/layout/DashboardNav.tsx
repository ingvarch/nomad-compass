import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAclPermissions } from '../../hooks/useAclPermissions';
import { ThemeToggle } from '../ui/ThemeToggle';
import { UserMenu } from '../ui/UserMenu';

export const DashboardNav: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [nomadAddr, setNomadAddr] = useState<string | null>(null);
  const location = useLocation();
  const pathname = location.pathname;
  const { logout } = useAuth();
  const { hasManagementAccess } = useAclPermissions();

  // Fetch Nomad address from server config
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setNomadAddr(data.nomadAddr))
      .catch(() => setNomadAddr(null));
  }, []);

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
                to="/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/dashboard')
                    ? 'border-blue-500 text-gray-900 dark:border-monokai-blue dark:text-monokai-text'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-monokai-muted dark:hover:border-monokai-surface dark:hover:text-monokai-text'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/jobs"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/jobs')
                    ? 'border-blue-500 text-gray-900 dark:border-monokai-blue dark:text-monokai-text'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-monokai-muted dark:hover:border-monokai-surface dark:hover:text-monokai-text'
                }`}
              >
                Jobs
              </Link>
              <Link
                to="/topology"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/topology')
                    ? 'border-blue-500 text-gray-900 dark:border-monokai-blue dark:text-monokai-text'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-monokai-muted dark:hover:border-monokai-surface dark:hover:text-monokai-text'
                }`}
              >
                Topology
              </Link>
              <Link
                to="/servers"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/servers')
                    ? 'border-blue-500 text-gray-900 dark:border-monokai-blue dark:text-monokai-text'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-monokai-muted dark:hover:border-monokai-surface dark:hover:text-monokai-text'
                }`}
              >
                Servers
              </Link>
              <Link
                to="/namespaces"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/namespaces')
                    ? 'border-blue-500 text-gray-900 dark:border-monokai-blue dark:text-monokai-text'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-monokai-muted dark:hover:border-monokai-surface dark:hover:text-monokai-text'
                }`}
              >
                Namespaces
              </Link>
              {hasManagementAccess && (
                <Link
                  to="/acl"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/acl')
                      ? 'border-blue-500 text-gray-900 dark:border-monokai-blue dark:text-monokai-text'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-monokai-muted dark:hover:border-monokai-surface dark:hover:text-monokai-text'
                  }`}
                >
                  ACL
                </Link>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <UserMenu nomadAddr={nomadAddr} onLogout={logout} />
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
            to="/dashboard"
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActive('/dashboard')
                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-monokai-surface dark:border-monokai-blue dark:text-monokai-blue'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 dark:text-monokai-muted dark:hover:bg-monokai-surface dark:hover:border-monokai-surface dark:hover:text-monokai-text'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/jobs"
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActive('/jobs')
                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-monokai-surface dark:border-monokai-blue dark:text-monokai-blue'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 dark:text-monokai-muted dark:hover:bg-monokai-surface dark:hover:border-monokai-surface dark:hover:text-monokai-text'
            }`}
          >
            Jobs
          </Link>
          <Link
            to="/topology"
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActive('/topology')
                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-monokai-surface dark:border-monokai-blue dark:text-monokai-blue'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 dark:text-monokai-muted dark:hover:bg-monokai-surface dark:hover:border-monokai-surface dark:hover:text-monokai-text'
            }`}
          >
            Topology
          </Link>
          <Link
            to="/servers"
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActive('/servers')
                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-monokai-surface dark:border-monokai-blue dark:text-monokai-blue'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 dark:text-monokai-muted dark:hover:bg-monokai-surface dark:hover:border-monokai-surface dark:hover:text-monokai-text'
            }`}
          >
            Servers
          </Link>
          <Link
            to="/namespaces"
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActive('/namespaces')
                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-monokai-surface dark:border-monokai-blue dark:text-monokai-blue'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 dark:text-monokai-muted dark:hover:bg-monokai-surface dark:hover:border-monokai-surface dark:hover:text-monokai-text'
            }`}
          >
            Namespaces
          </Link>
          {hasManagementAccess && (
            <Link
              to="/acl"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isActive('/acl')
                  ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-monokai-surface dark:border-monokai-blue dark:text-monokai-blue'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 dark:text-monokai-muted dark:hover:bg-monokai-surface dark:hover:border-monokai-surface dark:hover:text-monokai-text'
              }`}
            >
              ACL
            </Link>
          )}
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