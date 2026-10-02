import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Layers, Server, Activity, Menu } from 'lucide-react';

interface BottomNavProps {
  onOpenMore: () => void;
  isMoreOpen?: boolean;
}

interface NavTab {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

const navTabs: NavTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    isActive: (pathname) => pathname === '/' || pathname === '/dashboard',
  },
  {
    id: 'jobs',
    label: 'Jobs',
    path: '/jobs',
    icon: Layers,
    isActive: (pathname) => pathname.startsWith('/jobs'),
  },
  {
    id: 'topology',
    label: 'Topology',
    path: '/topology',
    icon: Server,
    isActive: (pathname) => pathname.startsWith('/topology') || pathname.startsWith('/nodes'),
  },
  {
    id: 'activity',
    label: 'Activity',
    path: '/activity',
    icon: Activity,
    isActive: (pathname) => pathname.startsWith('/activity') || pathname.startsWith('/allocations'),
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenMore, isMoreOpen = false }) => {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 dark:bg-monokai-bg/95 backdrop-blur-md border-t border-gray-200 dark:border-monokai-surface pb-safe"
    >
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const active = !isMoreOpen && tab.isActive(pathname);

          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`flex flex-col items-center justify-center py-1 transition-transform active:scale-90 ${
                active
                  ? 'text-blue-600 dark:text-monokai-blue font-semibold'
                  : 'text-gray-500 dark:text-monokai-muted hover:text-gray-900 dark:hover:text-monokai-text'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-monokai-blue" />
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Tab */}
        <button
          type="button"
          onClick={onOpenMore}
          aria-expanded={isMoreOpen}
          aria-label="Open More Menu"
          className={`flex flex-col items-center justify-center py-1 transition-transform active:scale-90 ${
            isMoreOpen
              ? 'text-blue-600 dark:text-monokai-blue font-semibold'
              : 'text-gray-500 dark:text-monokai-muted hover:text-gray-900 dark:hover:text-monokai-text'
          }`}
        >
          <div className="relative">
            <Menu className={`w-5 h-5 transition-transform ${isMoreOpen ? 'scale-110' : ''}`} />
            {isMoreOpen && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-monokai-blue" />
            )}
          </div>
          <span className="text-[11px] mt-1 tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
