'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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

    // Determine if the job is stopped based on status
    const isStopped = jobStatus?.toLowerCase() === 'dead' || false;
    // Determine if the job is running
    const isRunning = jobStatus?.toLowerCase() === 'running';

    const startJob = async () => {
        if (!confirm('Are you sure you want to start this job?')) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (!token || !nomadAddr) {
                throw new Error('Authentication required');
            }

            const client = createNomadClient(nomadAddr, token);

            // Get the job specification
            const jobSpec = await client.getJob(jobId);

            // Check if the job has a valid specification
            if (!jobSpec || !jobSpec.ID) {
                throw new Error('Could not retrieve job specification');
            }

            // Make sure the job is not marked as stopped
            if (jobSpec.Stop === true) {
                jobSpec.Stop = false;
            }

            // Submit the job again with the updated spec
            await client.createJob({ Job: jobSpec });

            alert('Job started successfully');

            // Redirect to jobs list
            router.push('/jobs');
        } catch (err) {
            console.error('Failed to start job:', err);
            setError(typeof err === 'object' && err !== null && 'message' in err
                ? (err as Error).message
                : 'Failed to start job. Please try again.');
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

    const deleteJob = async () => {
        if (!confirm('Are you sure you want to permanently delete this job? This action cannot be undone.')) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (!token || !nomadAddr) {
                throw new Error('Authentication required');
            }

            const client = createNomadClient(nomadAddr, token);
            await client.deleteJob(jobId);

            alert('Job deleted successfully');

            // Redirect to jobs list
            router.push('/jobs');
        } catch (err) {
            console.error('Failed to delete job:', err);
            setError(typeof err === 'object' && err !== null && 'message' in err
                ? (err as Error).message
                : 'Failed to delete job. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center space-x-2">
            {error && (
                <div className="text-red-600 text-sm mr-2">{error}</div>
            )}

            {isStopped ? (
                <>
                    <button
                        onClick={startJob}
                        disabled={isLoading}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                        {isLoading ? 'Working...' : 'Start'}
                    </button>
                    <button
                        onClick={deleteJob}
                        disabled={isLoading}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                    >
                        {isLoading ? 'Working...' : 'Delete'}
                    </button>
                </>
            ) : (
                <button
                    onClick={stopJob}
                    disabled={isLoading}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                    {isLoading ? 'Working...' : 'Stop'}
                </button>
            )}
        </div>
    );
};

export default JobActions;
