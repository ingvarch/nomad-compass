'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardNav from './DashboardNav';

interface ProtectedLayoutProps {
    children: React.ReactNode;
}

export const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If not authenticated, redirect to login page
        if (!isAuthenticated) {
            console.log('Not authenticated, redirecting to login...');
            // Use window.location for a hard redirect
            window.location.href = '/auth/login';
        }
    }, [isAuthenticated]);

    // Don't render anything while checking authentication
    if (!isAuthenticated) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <DashboardNav />
            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
};

export default ProtectedLayout;
