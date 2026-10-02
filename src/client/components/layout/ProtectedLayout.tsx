import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAclPermissions } from '../../hooks/useAclPermissions';
import { LoadingSpinner } from '../ui';
import DashboardNav from './DashboardNav';
import MobileHeader from './MobileHeader';
import BottomNav from './BottomNav';
import MoreMenuSheet from './MoreMenuSheet';
import PwaInstallPrompt from '../pwa/PwaInstallPrompt';

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { hasManagementAccess } = useAclPermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [nomadAddr, setNomadAddr] = useState<string | null>(null);

  const isExecRoute = location.pathname.startsWith('/exec/');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setNomadAddr(data.nomadAddr))
      .catch(() => setNomadAddr(null));
  }, []);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-monokai-bg flex items-center justify-center">
        <LoadingSpinner className="min-h-screen" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-monokai-bg">
      {/* Desktop Navigation */}
      <DashboardNav className="hidden sm:block" />

      {/* Mobile Top App Bar */}
      <MobileHeader />

      {/* Main Content Area (reduced bottom padding on exec routes to maximize terminal space) */}
      <main
        className={`max-w-7xl mx-auto pt-[calc(env(safe-area-inset-top,0px)+3.75rem)] sm:pt-6 ${
          isExecRoute
            ? 'pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-8'
            : 'pb-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] sm:pb-8'
        } px-4 sm:px-6 lg:px-8`}
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (hidden on exec terminal to avoid keyboard overlap) */}
      {!isExecRoute && (
        <BottomNav
          onOpenMore={() => setIsMoreOpen(true)}
          isMoreOpen={isMoreOpen}
        />
      )}

      {/* Mobile More Menu Sheet */}
      <MoreMenuSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        nomadAddr={nomadAddr}
        onLogout={logout}
        hasManagementAccess={hasManagementAccess}
      />

      {/* PWA Install & Update Prompts */}
      <PwaInstallPrompt />
    </div>
  );
};

export default ProtectedLayout;
