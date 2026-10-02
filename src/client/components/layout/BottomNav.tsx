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
    isActive: (pathname) => pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/allocations'),
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
    isActive: (pathname) => pathname.startsWith('/activity'),
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenMore, isMoreOpen = false }) => {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/85 dark:bg-monokai-bg/85 backdrop-blur-xl border-t border-gray-200/80 dark:border-monokai-surface/80 pb-safe pl-safe pr-safe"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="grid grid-cols-5 h-[50px] max-w-md mx-auto">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const active = !isMoreOpen && tab.isActive(pathname);

          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`flex flex-col items-center justify-center py-1 select-none active:opacity-60 transition-opacity ${
                active
                  ? 'text-blue-600 dark:text-monokai-blue font-medium'
                  : 'text-[#8E8E93] dark:text-[#98989D] hover:text-gray-900 dark:hover:text-monokai-text'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
              <span className="text-[10px] leading-tight mt-1 tracking-tight">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Tab */}
        <button
          type="button"
          onClick={onOpenMore}
          aria-expanded={isMoreOpen}
          aria-label="Open More Menu"
          className={`flex flex-col items-center justify-center py-1 select-none active:opacity-60 transition-opacity ${
            isMoreOpen
              ? 'text-blue-600 dark:text-monokai-blue font-medium'
              : 'text-[#8E8E93] dark:text-[#98989D] hover:text-gray-900 dark:hover:text-monokai-text'
          }`}
        >
          <Menu className={`w-5 h-5 ${isMoreOpen ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] leading-tight mt-1 tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
