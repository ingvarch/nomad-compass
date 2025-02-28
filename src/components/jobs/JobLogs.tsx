'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';

interface JobLogsProps {
    jobId: string;
    allocId?: string;
    taskName?: string;
}

export const JobLogs: React.FC<JobLogsProps> = ({ jobId, allocId, taskName }) => {
    const { token, nomadAddr } = useAuth();
    const [logs, setLogs] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allocations, setAllocations] = useState<any[]>([]);
    const [selectedAlloc, setSelectedAlloc] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [logType, setLogType] = useState<'stdout' | 'stderr'>('stdout');

    // Fetch job allocations
    useEffect(() => {
        const fetchAllocations = async () => {


            if (!token || !nomadAddr) {
                setError('Authentication required');
                setIsLoading(false);
                return;
            }

            try {
                // This is a simplified version - in a real app we would need to add the API for this

                const client = createNomadClient(nomadAddr, token);
                const allocs = await client.getJobAllocations(jobId);

                // Filter running allocations
                const runningAllocs = allocs.filter((alloc: any) => alloc.ClientStatus === 'running');
                setAllocations(runningAllocs);

                if (runningAllocs.length > 0) {
                    // Either use provided allocId or the first running allocation
                    const firstAlloc = allocId || runningAllocs[0].ID;
                    setSelectedAlloc(firstAlloc);

                    // Get tasks for this allocation
                    const allocInfo = await client.getAllocation(firstAlloc);
                    const taskNames = Object.keys(allocInfo.TaskStates || {});

                    if (taskNames.length > 0) {
                        setSelectedTask(taskName || taskNames[0]);
                    }
                }

                setIsLoading(false);
            } catch (err) {
                console.error('Failed to fetch allocations:', err);
                setError('Failed to load job allocations. Please try again.');
                setIsLoading(false);
            }
        };

        fetchAllocations();
    }, [jobId, token, nomadAddr, allocId, taskName]);

    // Fetch logs when allocation and task are selected
    useEffect(() => {
        const fetchLogs = async () => {
            if (!token || !nomadAddr || !selectedAlloc || !selectedTask) {
                return;
            }

            setIsLoading(true);
            try {
                const client = createNomadClient(nomadAddr, token);
                const logs = await client.getAllocationLogs(
                    selectedAlloc,
                    selectedTask,
                    logType,
                    true
                );

                setLogs(logs.Data || 'No logs available');
                setError(null);
            } catch (err) {
                console.error('Failed to fetch logs:', err);
                setError('Failed to load logs. Please try again.');
                setLogs('');
            } finally {
                setIsLoading(false);
            }
        };

        if (selectedAlloc && selectedTask) {
            fetchLogs();
        }
    }, [selectedAlloc, selectedTask, logType, token, nomadAddr]);

    if (error && !allocations.length) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        );
    }

    if (isLoading && !allocations.length) {
        return (
            <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!allocations.length) {
        return (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                            No running allocations found for this job.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Job Logs</h3>

                <div className="flex space-x-2 mt-2 sm:mt-0">
                    {/* Allocation Selector */}
                    {allocations.length > 1 && (
                        <select
                            value={selectedAlloc || ''}
                            onChange={(e) => setSelectedAlloc(e.target.value)}
                            className="block w-full sm:w-auto pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                            {allocations.map((alloc) => (
                                <option key={alloc.ID} value={alloc.ID}>
                                    {alloc.ID.substring(0, 8)}... - {alloc.ClientStatus}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Task Selector */}
                    {selectedAlloc && (
                        <select
                            value={selectedTask || ''}
                            onChange={(e) => setSelectedTask(e.target.value)}
                            className="block w-full sm:w-auto pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                            {allocations
                                    .find((alloc) => alloc.ID === selectedAlloc)
                                    ?.TaskStates &&
                                Object.keys(
                                    allocations.find((alloc) => alloc.ID === selectedAlloc)?.TaskStates || {}
                                ).map((task) => (
                                    <option key={task} value={task}>
                                        {task}
                                    </option>
                                ))}
                        </select>
                    )}

                    {/* Log Type Selector */}
                    <select
                        value={logType}
                        onChange={(e) => setLogType(e.target.value as 'stdout' | 'stderr')}
                        className="block w-full sm:w-auto pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    >
                        <option value="stdout">stdout</option>
                        <option value="stderr">stderr</option>
                    </select>
                </div>
            </div>

            <div className="p-6">
                {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                ) : (
                    <pre className="bg-gray-800 text-white p-4 rounded-md overflow-auto max-h-96 text-sm font-mono">
            {logs || 'No logs available'}
          </pre>
                )}
            </div>
        </div>
    );
};

export default JobLogs;
