import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createNomadClient } from '../../lib/api/nomad';
import { RefreshCw, Pause, Play } from 'lucide-react';

interface JobLogsProps {
    jobId: string;
    allocId?: string;
    taskName?: string;
    initialTaskGroup?: string | null;
}

export const JobLogs: React.FC<JobLogsProps> = ({ jobId, allocId, taskName, initialTaskGroup }) => {    const { isAuthenticated } = useAuth();
    const [logs, setLogs] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allocations, setAllocations] = useState<any[]>([]);
    const [selectedAlloc, setSelectedAlloc] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [logType, setLogType] = useState<'stdout' | 'stderr'>('stdout');
    const [taskGroups, setTaskGroups] = useState<any[]>([]);
    const [selectedTaskGroup, setSelectedTaskGroup] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'failed' | 'complete'>('all');
    const [allAllocations, setAllAllocations] = useState<any[]>([]);

    // Auto-refresh state
    const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
    const [refreshInterval, setRefreshInterval] = useState<number>(5); // seconds
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [showNomadTimestamp, setShowNomadTimestamp] = useState<boolean>(false);


    useEffect(() => {
        if (initialTaskGroup && initialTaskGroup !== selectedTaskGroup) {
            setError(null);
            setSelectedTaskGroup(initialTaskGroup);
        }
    }, [initialTaskGroup]);

    // Fetch job data to get task groups
    useEffect(() => {
        const fetchJobData = async () => {
            if (!isAuthenticated) {
                setError('Authentication required');
                setIsLoading(false);
                return;
            }

            try {
                const client = createNomadClient();
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
    }, [jobId, isAuthenticated, selectedTaskGroup]);

    // Fetch job allocations based on selected task group and status filter
    useEffect(() => {
        const fetchAllocations = async () => {
            if (!isAuthenticated) {
                setError('Authentication required');
                setIsLoading(false);
                return;
            }

            try {
                const client = createNomadClient();
                const namespace = new URLSearchParams(window.location.search).get('namespace') || 'default';
                const allocs = await client.getJobAllocations(jobId, namespace);

                // Filter by task group first
                const groupFilteredAllocs = allocs.filter((alloc: any) => {
                    if (selectedTaskGroup) {
                        return alloc.TaskGroup === selectedTaskGroup;
                    }
                    return true;
                });

                // Store all allocations for this task group (for status filter options)
                setAllAllocations(groupFilteredAllocs);

                // Apply status filter
                const filteredAllocs = groupFilteredAllocs.filter((alloc: any) => {
                    if (statusFilter === 'all') return true;
                    if (statusFilter === 'failed') {
                        return alloc.ClientStatus === 'failed' || alloc.ClientStatus === 'lost';
                    }
                    return alloc.ClientStatus === statusFilter;
                });

                // Sort by ModifyTime descending (most recent first)
                filteredAllocs.sort((a: any, b: any) => b.ModifyTime - a.ModifyTime);

                setAllocations(filteredAllocs);

                if (filteredAllocs.length > 0) {
                    // Either use provided allocId or the first allocation
                    const firstAlloc = allocId || filteredAllocs[0].ID;
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
                    setLogs('');
                }

                setError(null);
                setIsLoading(false);
            } catch (err) {
                console.error('Failed to fetch allocations:', err);
                setError('Failed to load job allocations. Please try again.');
                setIsLoading(false);
            }
        };

        if (selectedTaskGroup) {
            setLogs('');
            setSelectedAlloc(null);
            setSelectedTask(null);

            setIsLoading(true);
            const timer = setTimeout(() => {
                fetchAllocations();
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [jobId, isAuthenticated, allocId, taskName, selectedTaskGroup, statusFilter]);

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        if (!isAuthenticated || !selectedAlloc || !selectedTask) {
            return;
        }

        setIsLoading(true);
        try {
            const client = createNomadClient();
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
    }, [selectedAlloc, selectedTask, logType, isAuthenticated]);

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
        // Reset allocation, task and status filter when changing task group
        setSelectedAlloc(null);
        setSelectedTask(null);
        setStatusFilter('all');
        setAllAllocations([]);
    };

    // Manual refresh
    const handleManualRefresh = () => {
        fetchLogs();
    };

    // Format logs by stripping Nomad timestamp prefix
    const formatLogs = (rawLogs: string): string => {
        if (showNomadTimestamp || !rawLogs) return rawLogs;

        // Nomad format: 2026-01-05T02:06:04.596760477+00:00 stdout F <content>
        const nomadPrefixRegex = /^\d{4}-\d{2}-\d{2}T[\d:.]+[+-]\d{2}:\d{2}\s+(?:stdout|stderr)\s+\w\s+/;

        return rawLogs
            .split('\n')
            .map(line => line.replace(nomadPrefixRegex, ''))
            .join('\n');
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
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Job Logs</h3>

                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                    {/* Task Group Selector */}
                    {taskGroups.length > 0 && (
                        <select
                            value={selectedTaskGroup || ''}
                            onChange={handleTaskGroupChange}
                            className="block w-full sm:w-auto pl-3 pr-10 py-1 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                            <option value="">Select Task Group</option>
                            {taskGroups.map((group) => (
                                <option key={group.Name} value={group.Name}>
                                    {group.Name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Status Filter */}
                    {selectedTaskGroup && (
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'running' | 'failed' | 'complete')}
                            className="block w-full sm:w-auto pl-3 pr-10 py-1 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                            <option value="all">All Status</option>
                            <option value="running">Running</option>
                            <option value="failed">Failed/Lost</option>
                            <option value="complete">Complete</option>
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

                    {/* Nomad timestamp toggle */}
                    <label className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showNomadTimestamp}
                            onChange={(e) => setShowNomadTimestamp(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Nomad time
                    </label>

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
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    {allAllocations.length === 0
                                        ? 'No allocations found for this task group.'
                                        : statusFilter === 'running'
                                            ? `No running allocations. ${allAllocations.filter(a => a.ClientStatus === 'failed' || a.ClientStatus === 'lost').length > 0 ? 'Try selecting "Failed/Lost" to view failed allocation logs.' : ''}`
                                            : statusFilter === 'failed'
                                                ? 'No failed allocations found.'
                                                : `No allocations match the selected filter.`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Failed allocation banner */}
                {selectedAlloc && allocations.find(a => a.ID === selectedAlloc)?.ClientStatus === 'failed' && (
                    <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                        <div className="flex">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                    Viewing logs from a failed allocation
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                                    {allocations.find(a => a.ID === selectedAlloc)?.ClientDescription || 'Allocation failed'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lost allocation banner */}
                {selectedAlloc && allocations.find(a => a.ID === selectedAlloc)?.ClientStatus === 'lost' && (
                    <div className="mb-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3">
                        <div className="flex">
                            <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                    Viewing logs from a lost allocation
                                </p>
                                <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                                    The node running this allocation became unavailable
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    {lastRefreshed && (
                        <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
                    )}
                    {autoRefresh && (
                        <span>Auto-refreshing every {refreshInterval} seconds</span>
                    )}
                </div>

                <pre className={`p-4 rounded-md overflow-auto max-h-96 text-sm font-mono ${
                    isLoading ? 'opacity-50' : ''
                } ${
                    selectedAlloc && allocations.find(a => a.ID === selectedAlloc)?.ClientStatus === 'failed'
                        ? 'bg-red-950 text-red-100 border-2 border-red-500'
                        : selectedAlloc && allocations.find(a => a.ID === selectedAlloc)?.ClientStatus === 'lost'
                            ? 'bg-orange-950 text-orange-100 border-2 border-orange-500'
                            : 'bg-gray-800 text-white'
                }`}>
                    {formatLogs(logs) || 'No logs available'}
                </pre>
            </div>
        </div>
    );
};

export default JobLogs;
