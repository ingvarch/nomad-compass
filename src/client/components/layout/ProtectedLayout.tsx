import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../ui';
import DashboardNav from './DashboardNav';

export const ProtectedLayout: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate('/auth/login', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-monokai-bg">
                <LoadingSpinner className="min-h-screen" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-monokai-bg">
            <DashboardNav />
            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
};

export default ProtectedLayout;
