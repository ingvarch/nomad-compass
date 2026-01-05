import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
            <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-monokai-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-monokai-blue"></div>
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
