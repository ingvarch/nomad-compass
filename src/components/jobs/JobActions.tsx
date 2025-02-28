'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';

interface JobActionsProps {
    jobId: string;
    jobStatus?: string;
}

export const JobActions: React.FC<JobActionsProps> = ({ jobId, jobStatus }) => {
    const router = useRouter();
    const { token, nomadAddr } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const restartJob = async () => {
        if (!confirm('Are you sure you want to restart this job?')) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (!token || !nomadAddr) {
                throw new Error('Authentication required');
            }

            const client = createNomadClient(nomadAddr, token);
            await client.restartJob(jobId);

            alert('Job restart initiated successfully');

            // Refresh the page to see updated status
            router.refresh();
        } catch (err) {
            console.error('Failed to restart job:', err);
            setError(typeof err === 'object' && err !== null && 'message' in err
                ? (err as Error).message
                : 'Failed to restart job. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const stopJob = async () => {
        if (!confirm('Are you sure you want to stop this job?')) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (!token || !nomadAddr) {
                throw new Error('Authentication required');
            }

            const client = createNomadClient(nomadAddr, token);
            await client.stopJob(jobId);

            alert('Job stopped successfully');

            // Redirect to jobs list
            router.push('/jobs');
        } catch (err) {
            console.error('Failed to stop job:', err);
            setError(typeof err === 'object' && err !== null && 'message' in err
                ? (err as Error).message
                : 'Failed to stop job. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const isRunning = jobStatus?.toLowerCase() === 'running';

    return (
        <div className="flex items-center space-x-2">
            {error && (
                <div className="text-red-600 text-sm mr-2">{error}</div>
            )}

            {isRunning && (
                <button
                    onClick={restartJob}
                    disabled={isLoading}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {isLoading ? 'Working...' : 'Restart'}
                </button>
            )}

            <button
                onClick={stopJob}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
                {isLoading ? 'Working...' : 'Stop'}
            </button>
        </div>
    );
};

export default JobActions;
