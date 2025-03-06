'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import { RefreshCw, Pause, Play } from 'lucide-react';

interface JobLogsProps {
    jobId: string;
    allocId?: string;
    taskName?: string;
    initialTaskGroup?: string | null;
}

export const JobLogs: React.FC<JobLogsProps> = ({ jobId, allocId, taskName, initialTaskGroup }) => {    const { token, nomadAddr } = useAuth();
    const [logs, setLogs] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allocations, setAllocations] = useState<any[]>([]);
    const [selectedAlloc, setSelectedAlloc] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [logType, setLogType] = useState<'stdout' | 'stderr'>('stdout');
    const [taskGroups, setTaskGroups] = useState<any[]>([]);
    const [selectedTaskGroup, setSelectedTaskGroup] = useState<string | null>(null);

    // Auto-refresh state
    const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
    const [refreshInterval, setRefreshInterval] = useState<number>(5); // seconds
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);


    useEffect(() => {
        if (initialTaskGroup) {
            setSelectedTaskGroup(initialTaskGroup);
        }
    }, [initialTaskGroup]);

    // Fetch job data to get task groups
    useEffect(() => {
        const fetchJobData = async () => {
            if (!token || !nomadAddr) {
                setError('Authentication required');
                setIsLoading(false);
                return;
            }

            try {
                const client = createNomadClient(nomadAddr, token);
                const namespace = new URLSearchParams(window.location.search).get('namespace') || 'default';
                const jobData = await client.getJob(jobId, namespace);

                // Set task groups from job data
                if (jobData && jobData.TaskGroups) {
                    setTaskGroups(jobData.TaskGroups);
                    // Set the first task group as selected by default if none is selected
                    if (!selectedTaskGroup && jobData.TaskGroups.length > 0) {
                        setSelectedTaskGroup(jobData.TaskGroups[0].Name);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch job data:', err);
                setError('Failed to load job data. Please try again.');
            }
        };

        fetchJobData();
    }, [jobId, token, nomadAddr, selectedTaskGroup]);

    // Fetch job allocations based on selected task group
    useEffect(() => {
        const fetchAllocations = async () => {
            if (!token || !nomadAddr) {
                setError('Authentication required');
                setIsLoading(false);
                return;
            }

            try {
                const client = createNomadClient(nomadAddr, token);
                const namespace = new URLSearchParams(window.location.search).get('namespace') || 'default';
                const allocs = await client.getJobAllocations(jobId, namespace);

                // Filter running allocations
                const runningAllocs = allocs.filter((alloc: any) => {
                    // If a task group is selected, only show allocations for that group
                    if (selectedTaskGroup) {
                        return alloc.ClientStatus === 'running' && alloc.TaskGroup === selectedTaskGroup;
                    }
                    return alloc.ClientStatus === 'running';
                });

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
                } else {
                    setSelectedAlloc(null);
                    setSelectedTask(null);
                    setLogs('No running allocations for this task group');
                }

                setIsLoading(false);
            } catch (err) {
                console.error('Failed to fetch allocations:', err);
                setError('Failed to load job allocations. Please try again.');
                setIsLoading(false);
            }
        };

        if (selectedTaskGroup) {
            setIsLoading(true);
            fetchAllocations();
        }
    }, [jobId, token, nomadAddr, allocId, taskName, selectedTaskGroup]);

    // Fetch logs
    const fetchLogs = useCallback(async () => {
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
            setLastRefreshed(new Date());
            setError(null);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
            setError('Failed to load logs. Please try again.');
            setLogs('');
        } finally {
            setIsLoading(false);
        }
    }, [selectedAlloc, selectedTask, logType, token, nomadAddr]);

    // Fetch logs on allocation or task change
    useEffect(() => {
        if (selectedAlloc && selectedTask) {
            fetchLogs();
        }
    }, [selectedAlloc, selectedTask, logType, fetchLogs]);

    // Setup auto-refresh timer
    useEffect(() => {
        // Clear any existing timer when dependencies change
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }

        // Only setup the timer if auto-refresh is enabled
        if (autoRefresh && selectedAlloc && selectedTask) {
            refreshTimerRef.current = setInterval(() => {
                fetchLogs();
            }, refreshInterval * 1000);
        }

        // Cleanup on unmount
        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }
        };
    }, [autoRefresh, refreshInterval, selectedAlloc, selectedTask, fetchLogs]);

    // Toggle auto-refresh
    const toggleAutoRefresh = () => {
        setAutoRefresh(prev => !prev);
    };

    // Handle refresh interval change
    const handleRefreshIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRefreshInterval(Number(e.target.value));
    };

    // Handle task group change
    const handleTaskGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTaskGroup = e.target.value;
        setSelectedTaskGroup(newTaskGroup);
        // Reset allocation and task when changing task group
        setSelectedAlloc(null);
        setSelectedTask(null);
    };

    // Manual refresh
    const handleManualRefresh = () => {
        fetchLogs();
    };

    if (error && !allocations.length && !selectedTaskGroup) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        );
    }

    if (isLoading && !allocations.length && !taskGroups.length) {
        return (
            <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Job Logs</h3>

                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                    {/* Task Group Selector */}
                    {taskGroups.length > 0 && (
                        <select
                            value={selectedTaskGroup || ''}
                            onChange={handleTaskGroupChange}
                            className="block w-full sm:w-auto pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                            <option value="">Select Task Group</option>
                            {taskGroups.map((group) => (
                                <option key={group.Name} value={group.Name}>
                                    {group.Name}
                                </option>
                            ))}
                        </select>
                    )}

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

                    {/* Auto-refresh controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleAutoRefresh}
                            className={`inline-flex items-center px-2 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                autoRefresh
                                    ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200 focus:ring-gray-500'
                            }`}
                            title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
                        >
                            {autoRefresh ? <Pause size={16} /> : <Play size={16} />}
                            <span className="ml-1">Auto</span>
                        </button>

                        {autoRefresh && (
                            <select
                                value={refreshInterval}
                                onChange={handleRefreshIntervalChange}
                                className="block w-full sm:w-auto pl-2 pr-7 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                            >
                                <option value="2">2s</option>
                                <option value="5">5s</option>
                                <option value="10">10s</option>
                                <option value="30">30s</option>
                                <option value="60">60s</option>
                            </select>
                        )}

                        <button
                            onClick={handleManualRefresh}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={isLoading || !selectedAlloc || !selectedTask}
                            title="Refresh logs"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {isLoading && !logs && (
                    <div className="flex justify-center items-center h-24">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {!selectedTaskGroup && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    Please select a task group to view logs.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {selectedTaskGroup && allocations.length === 0 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    No running allocations found for the selected task group.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-2 flex justify-between items-center text-xs text-gray-500">
                    {lastRefreshed && (
                        <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
                    )}
                    {autoRefresh && (
                        <span>Auto-refreshing every {refreshInterval} seconds</span>
                    )}
                </div>

                <pre className={`bg-gray-800 text-white p-4 rounded-md overflow-auto max-h-96 text-sm font-mono ${isLoading ? 'opacity-50' : ''}`}>
                    {logs || 'No logs available'}
                </pre>
            </div>
        </div>
    );
};

export default JobLogs;
