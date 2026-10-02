import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAclPermissions } from '../../hooks/useAclPermissions';
import { LoadingSpinner } from '../ui';
import DashboardNav from './DashboardNav';
import MobileHeader from './MobileHeader';
import BottomNav from './BottomNav';
import MoreMenuSheet from './MoreMenuSheet';

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { hasManagementAccess } = useAclPermissions();
  const navigate = useNavigate();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [nomadAddr, setNomadAddr] = useState<string | null>(null);

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

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto pt-[calc(env(safe-area-inset-top)+4.25rem)] sm:pt-6 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:pb-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        onOpenMore={() => setIsMoreOpen(true)}
        isMoreOpen={isMoreOpen}
      />

      {/* Mobile More Menu Sheet */}
      <MoreMenuSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        nomadAddr={nomadAddr}
        onLogout={logout}
        hasManagementAccess={hasManagementAccess}
      />
    </div>
  );
};

export default ProtectedLayout;
