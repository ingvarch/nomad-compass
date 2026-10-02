import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

interface RouteMeta {
  title: string;
  backTo?: string;
  showCreateJob?: boolean;
}

function getRouteMeta(pathname: string): RouteMeta {
  if (pathname === '/' || pathname === '/dashboard') {
    return { title: 'Dashboard', showCreateJob: true };
  }
  if (pathname === '/jobs') {
    return { title: 'Jobs', showCreateJob: true };
  }
  if (pathname === '/jobs/create') {
    return { title: 'Create Job', backTo: '/jobs' };
  }
  if (pathname.startsWith('/jobs/') && pathname.endsWith('/edit')) {
    const parts = pathname.split('/');
    const jobId = parts[2];
    return { title: 'Edit Job', backTo: `/jobs/${jobId}` };
  }
  if (pathname.startsWith('/jobs/')) {
    return { title: 'Job Details', backTo: '/jobs' };
  }
  if (pathname === '/topology') {
    return { title: 'Topology' };
  }
  if (pathname === '/nodes') {
    return { title: 'Nodes' };
  }
  if (pathname.startsWith('/nodes/')) {
    return { title: 'Node Details', backTo: '/nodes' };
  }
  if (pathname === '/servers') {
    return { title: 'Servers', backTo: '/dashboard' };
  }
  if (pathname === '/namespaces') {
    return { title: 'Namespaces', backTo: '/dashboard' };
  }
  if (pathname === '/variables') {
    return { title: 'Variables', backTo: '/dashboard' };
  }
  if (pathname === '/node-pools') {
    return { title: 'Node Pools', backTo: '/dashboard' };
  }
  if (pathname === '/activity') {
    return { title: 'Activity' };
  }
  if (pathname === '/allocations') {
    return { title: 'Allocations' };
  }
  if (pathname === '/allocations/failed') {
    return { title: 'Failed Allocs', backTo: '/allocations' };
  }
  if (pathname === '/acl') {
    return { title: 'ACL' };
  }
  if (pathname.startsWith('/exec/')) {
    return { title: 'Remote Exec', backTo: '/jobs' };
  }
  return { title: 'ovoo' };
}

export const MobileHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { title, backTo, showCreateJob } = getRouteMeta(location.pathname);

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 pt-safe h-14 bg-white/95 dark:bg-monokai-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-monokai-surface sm:hidden">
      <div className="flex items-center justify-between h-full px-3.5">
        {/* Left: Back button or Logo */}
        <div className="flex items-center min-w-[70px]">
          {backTo ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-0.5 text-blue-600 dark:text-monokai-blue font-medium text-sm -ml-1 p-1 rounded-lg active:scale-95 transition-transform"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          ) : (
            <Link to="/dashboard" className="flex items-center gap-2 active:opacity-80 transition-opacity">
              <img src="/icons/icon-192.png" alt="ovoo" className="w-7 h-7 rounded-md shadow-xs" />
              <span className="font-bold text-lg text-blue-600 dark:text-monokai-blue tracking-tight">ovoo</span>
            </Link>
          )}
        </div>

        {/* Center: Title */}
        <div className="flex-1 text-center truncate px-2">
          <h1 className="text-base font-semibold text-gray-900 dark:text-monokai-text truncate">
            {title}
          </h1>
        </div>

        {/* Right: Action or Theme */}
        <div className="flex items-center justify-end min-w-[70px] gap-1.5">
          {showCreateJob ? (
            <Link
              to="/jobs/create"
              aria-label="Create Job"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 dark:bg-monokai-blue text-white dark:text-monokai-bg font-medium shadow-sm active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </Link>
          ) : (
            <ThemeToggle className="scale-90" />
          )}
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
