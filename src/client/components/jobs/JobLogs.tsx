import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createNomadClient } from '../../lib/api/nomad';
import { isPermissionError, getErrorMessage } from '../../lib/errors';
import { LoadingSpinner, ErrorAlert } from '../ui';
import { RefreshCw, Radio } from 'lucide-react';
import { useLogStream } from '../../hooks/useLogStream';

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

    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [showNomadTimestamp, setShowNomadTimestamp] = useState<boolean>(false);

    // Streaming mode state
    const [streamingMode, setStreamingMode] = useState<boolean>(false);
    const [streamError, setStreamError] = useState<string | null>(null);

    // Ref for auto-scroll
    const logsContainerRef = useRef<HTMLPreElement>(null);

    // Streaming hook
    const {
        logs: streamLogs,
        isStreaming,
        startStream,
        stopStream,
        clearLogs: clearStreamLogs,
    } = useLogStream({
        allocId: selectedAlloc || '',
        task: selectedTask || '',
        logType,
        onError: setStreamError,
    });

    // Auto-scroll to bottom when logs change
    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs, streamLogs]);

    useEffect(() => {
        if (initialTaskGroup && initialTaskGroup !== selectedTaskGroup) {
            setError(null);
            setSelectedTaskGroup(initialTaskGroup);
        }
    }, [initialTaskGroup, selectedTaskGroup]);

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
            } catch {
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
            } catch {
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
            if (isPermissionError(err)) {
                setError('You do not have permission to view logs. The read-logs capability is required.');
            } else {
                const message = getErrorMessage(err, 'Failed to load logs');
                // Check if this might be a permission issue disguised as 500
                if (message.includes('500') || message.includes('Internal Server Error')) {
                    setError('Unable to fetch logs. This may be due to insufficient permissions (read-logs capability required) or the allocation may no longer be available.');
                } else {
                    setError(message);
                }
            }
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

    // Toggle streaming mode
    const toggleStreamingMode = () => {
        if (streamingMode) {
            // Stop streaming
            stopStream();
            setStreamingMode(false);
            setStreamError(null);
            // Fetch current logs once
            fetchLogs();
        } else {
            // Start streaming
            setStreamingMode(true);
            setStreamError(null);
            clearStreamLogs();
            startStream();
        }
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
        return <ErrorAlert message={error} showTitle />;
    }

    if (isLoading && !allocations.length && !taskGroups.length) {
        return <LoadingSpinner size="sm" className="h-24" />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Job Logs</h3>

                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0 items-center">
                    {/* Task Group Selector */}
                    <select
                        value={selectedTaskGroup || ''}
                        onChange={handleTaskGroupChange}
                        disabled={taskGroups.length === 0}
                        className={`block w-full sm:w-auto pl-3 pr-10 py-1 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md ${
                            taskGroups.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        <option value="">Task Group</option>
                        {taskGroups.map((group) => (
                            <option key={group.Name} value={group.Name}>
                                {group.Name}
                            </option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'running' | 'failed' | 'complete')}
                        disabled={!selectedTaskGroup}
                        className={`block w-full sm:w-auto pl-3 pr-10 py-1 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md ${
                            !selectedTaskGroup ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        <option value="all">All Status</option>
                        <option value="running">Running</option>
                        <option value="failed">Failed/Lost</option>
                        <option value="complete">Complete</option>
                    </select>

                    {/* Allocation Selector */}
                    <select
                        value={selectedAlloc || ''}
                        onChange={(e) => setSelectedAlloc(e.target.value)}
                        disabled={allocations.length <= 1}
                        className={`block w-full sm:w-auto pl-3 pr-10 py-1 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md ${
                            allocations.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        {allocations.length === 0 ? (
                            <option value="">Allocation</option>
                        ) : (
                            allocations.map((alloc) => (
                                <option key={alloc.ID} value={alloc.ID}>
                                    {alloc.ID.substring(0, 8)}... - {alloc.ClientStatus}
                                </option>
                            ))
                        )}
                    </select>

                    {/* Task Selector */}
                    <select
                        value={selectedTask || ''}
                        onChange={(e) => setSelectedTask(e.target.value)}
                        disabled={!selectedAlloc}
                        className={`block w-full sm:w-auto pl-3 pr-10 py-1 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md ${
                            !selectedAlloc ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        {!selectedAlloc ? (
                            <option value="">Task</option>
                        ) : (
                            Object.keys(
                                allocations.find((alloc) => alloc.ID === selectedAlloc)?.TaskStates || {}
                            ).map((task) => (
                                <option key={task} value={task}>
                                    {task}
                                </option>
                            ))
                        )}
                    </select>

                    {/* Log Type Selector */}
                    <select
                        value={logType}
                        onChange={(e) => setLogType(e.target.value as 'stdout' | 'stderr')}
                        className="block w-full sm:w-auto pl-3 pr-10 py-1 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    >
                        <option value="stdout">stdout</option>
                        <option value="stderr">stderr</option>
                    </select>

                    {/* Nomad timestamp toggle */}
                    <label className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 cursor-pointer whitespace-nowrap">
                        <input
                            type="checkbox"
                            checked={showNomadTimestamp}
                            onChange={(e) => setShowNomadTimestamp(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Nomad time
                    </label>

                    {/* Refresh controls */}
                    <div className="flex items-center gap-2">
                        {/* Streaming toggle */}
                        <button
                            onClick={toggleStreamingMode}
                            disabled={!selectedAlloc || !selectedTask}
                            className={`inline-flex items-center px-2 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                streamingMode
                                    ? 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                    : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-500'
                            } ${!selectedAlloc || !selectedTask ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={streamingMode ? 'Stop streaming (live)' : 'Start streaming (live)'}
                        >
                            <Radio size={16} className={isStreaming ? 'animate-pulse' : ''} />
                            <span className="ml-1">{streamingMode ? 'Live' : 'Stream'}</span>
                        </button>

                        {/* Manual refresh - invisible when streaming to prevent layout shift */}
                        <button
                            onClick={handleManualRefresh}
                            className={`inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                streamingMode ? 'invisible' : ''
                            }`}
                            disabled={isLoading || !selectedAlloc || !selectedTask || streamingMode}
                            title="Refresh logs"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {isLoading && !logs && (
                    <LoadingSpinner size="sm" className="h-24" />
                )}

                {error && <ErrorAlert message={error} />}

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
                    {streamingMode ? (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Streaming live logs...
                        </span>
                    ) : lastRefreshed ? (
                        <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
                    ) : null}
                </div>

                {/* Streaming error */}
                {streamError && (
                    <div className="mb-2 text-sm text-red-600 dark:text-red-400">
                        Stream error: {streamError}
                    </div>
                )}

                <pre
                    ref={logsContainerRef}
                    className={`p-4 rounded-md overflow-auto max-h-96 text-sm font-mono ${
                        isLoading && !streamingMode ? 'opacity-50' : ''
                    } ${
                        selectedAlloc && allocations.find(a => a.ID === selectedAlloc)?.ClientStatus === 'failed'
                            ? 'bg-red-950 text-red-100 border-2 border-red-500'
                            : selectedAlloc && allocations.find(a => a.ID === selectedAlloc)?.ClientStatus === 'lost'
                                ? 'bg-orange-950 text-orange-100 border-2 border-orange-500'
                                : streamingMode
                                    ? 'bg-gray-900 text-green-400 border-2 border-green-600'
                                    : 'bg-gray-800 text-white'
                    }`}
                >
                    {streamingMode
                        ? (formatLogs(streamLogs) || 'Waiting for log data...')
                        : (formatLogs(logs) || 'No logs available')
                    }
                </pre>
            </div>
        </div>
    );
};

export default JobLogs;
