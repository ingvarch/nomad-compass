// src/app/jobs/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import JobLogs from '@/components/jobs/JobLogs';
import JobActions from '@/components/jobs/JobActions';
import EnvironmentVariableDisplay from '@/components/jobs/EnvironmentVariableDisplay';
import { useToast } from '@/context/ToastContext';

export default function JobDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { token, nomadAddr } = useAuth();
    const { addToast } = useToast();
    const [job, setJob] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTaskGroup, setSelectedTaskGroup] = useState<number>(0);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const jobId = params.id as string;
    const namespace = searchParams.get('namespace') || 'default';

    const fetchJobDetail = useCallback(async () => {
        if (!token || !nomadAddr) {
            setError('Authentication required');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const client = createNomadClient(nomadAddr, token);
            const jobDetail = await client.getJob(jobId, namespace);
            setJob(jobDetail);

            // Initialize expanded state for all task groups
            if (jobDetail.TaskGroups && jobDetail.TaskGroups.length > 0) {
                const initialExpandedState: Record<string, boolean> = {};
                jobDetail.TaskGroups.forEach((group: any) => {
                    initialExpandedState[group.Name] = false; // All groups collapsed by default
                    initialExpandedState[`${group.Name}-container`] = false; // All containers collapsed by default too
                });
                setExpandedGroups(initialExpandedState);
            }

            setError(null);
        } catch (err) {
            console.error('Failed to fetch job details:', err);
            setError('Failed to load job details. Please check your connection and try again.');
            addToast('Failed to load job details', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [token, nomadAddr, jobId, namespace, addToast]);

    // Initial fetch
    useEffect(() => {
        fetchJobDetail();
    }, [fetchJobDetail]);

    // Toggle task group details visibility
    const toggleGroupDetails = (groupName: string) => {
        setExpandedGroups({
            ...expandedGroups,
            [groupName]: !expandedGroups[groupName]
        });
    };

    // Format timestamp to readable date
    const formatDate = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    // Get health check details for a task group
    const getHealthChecks = (taskGroup: any) => {
        if (!taskGroup || !taskGroup.Services || !taskGroup.Services.length) {
            return null;
        }

        return taskGroup.Services.map((service: any, index: number) => {
            if (!service.Checks || !service.Checks.length) {
                return null;
            }

            return (
                <div key={index} className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Health Check for {service.Name}</h5>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Path/Command
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Interval
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Timeout
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Check Restart
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {service.Checks.map((check: any, checkIndex: number) => (
                                <tr key={checkIndex}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {check.Type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {check.Path || check.Command || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {check.Interval ? `${Math.round(check.Interval / 1000000000)}s` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {check.Timeout ? `${Math.round(check.Timeout / 1000000000)}s` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {check.CheckRestart ? (
                                            <div>
                                                <span>Limit: {check.CheckRestart.Limit}</span>
                                                <br />
                                                <span>Grace: {Math.round(check.CheckRestart.Grace / 1000000000)}s</span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        });
    };

    // Get network and port configuration
    const getNetworkConfig = (taskGroup: any) => {
        if (!taskGroup || !taskGroup.Networks || !taskGroup.Networks.length) {
            return null;
        }

        return taskGroup.Networks.map((network: any, index: number) => {
            const hasDynamic = network.DynamicPorts && network.DynamicPorts.length > 0;
            const hasReserved = network.ReservedPorts && network.ReservedPorts.length > 0;

            if (!hasDynamic && !hasReserved) {
                return null;
            }

            return (
                <div key={index} className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Network Configuration (Mode: {network.Mode})</h5>

                    {hasDynamic && (
                        <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">Dynamic Ports</div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Label
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Host Port
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Container Port
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {network.DynamicPorts.map((port: any, portIndex: number) => (
                                        <tr key={portIndex}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {port.Label}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                Dynamic
                                            </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {port.To || port.Value || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {hasReserved && (
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Static Ports</div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Label
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Host Port
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Container Port
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {network.ReservedPorts.map((port: any, portIndex: number) => (
                                        <tr key={portIndex}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {port.Label}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {port.Value}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {port.To || port.Value || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            );
        });
    };

    const handleStatusChange = () => {
        fetchJobDetail();
    };

    // Render loading state
    if (isLoading) {
        return (
            <ProtectedLayout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </ProtectedLayout>
        );
    }

    // Render error state
    if (error) {
        return (
            <ProtectedLayout>
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            </ProtectedLayout>
        );
    }

    // Render "not found" state
    if (!job) {
        return (
            <ProtectedLayout>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Job not found.
                            </p>
                        </div>
                    </div>
                </div>
            </ProtectedLayout>
        );
    }

    return (
        <ProtectedLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">{job.Name || job.ID}</h1>
                        <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-gray-600">
                                Job ID: {job.ID}
                            </p>
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Namespace: {job.Namespace || 'default'}
                            </span>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <Link
                            href={`/jobs/${job.ID}/edit?namespace=${job.Namespace || 'default'}`}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Edit
                        </Link>
                        <Link
                            href="/jobs"
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Back to Jobs
                        </Link>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg overflow-hidden">
                    {/* Job Summary */}
                    <div className="px-6 py-5 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Job Summary</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <dl>
                                <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 rounded-md">
                                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            job.Status === 'running' ? 'bg-green-100 text-green-800' :
                                                job.Status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    job.Stop ? 'bg-gray-100 text-gray-800' :
                                                        'bg-red-100 text-red-800'
                                        }`}>
                                            {job.Status} {job.Stop ? '(Stopped)' : ''}
                                        </span>
                                    </dd>
                                </div>
                                <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">Type</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{job.Type}</dd>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 rounded-md">
                                    <dt className="text-sm font-medium text-gray-500">Priority</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{job.Priority}</dd>
                                </div>
                                <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">Datacenters</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                        {job.Datacenters && job.Datacenters.join(', ')}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                        <div>
                            <dl>
                                <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 rounded-md">
                                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                        {job.CreateTime ? formatDate(job.CreateTime) : 'Unknown'}
                                    </dd>
                                </div>
                                <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">Modified</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                        {job.ModifyTime ? formatDate(job.ModifyTime) : 'Unknown'}
                                    </dd>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 rounded-md">
                                    <dt className="text-sm font-medium text-gray-500">Namespace</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {job.Namespace || 'default'}
                                        </span>
                                    </dd>
                                </div>
                                <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">Version</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                        {job.Version || 'Unknown'}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* Task Groups */}
                {job.TaskGroups && job.TaskGroups.length > 0 && (
                    <div className="space-y-6">
                        {job.TaskGroups.map((taskGroup: any, groupIndex: number) => (
                            <div key={groupIndex} className="bg-white shadow rounded-lg overflow-hidden">
                                <div 
                                    className="px-6 py-5 border-b border-gray-200 flex items-center cursor-pointer"
                                    onClick={() => toggleGroupDetails(taskGroup.Name)}
                                >
                                    <svg
                                        className={`h-5 w-5 text-gray-500 transition-transform mr-2 ${expandedGroups[taskGroup.Name] ? 'transform rotate-90' : ''}`}
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Task Group: {taskGroup.Name}
                                        <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                            Count: {taskGroup.Count}
                                        </span>
                                    </h3>
                                </div>
                                {expandedGroups[taskGroup.Name] && (
                                <div className="p-6">
                                    {/* Network Configuration */}
                                    {getNetworkConfig(taskGroup)}

                                    {/* Health Checks */}
                                    {getHealthChecks(taskGroup)}

                                    {/* Task (Container) */}
                                    <div className="mt-6">
                                        <h4 className="text-lg font-medium text-gray-800">Container</h4>
                                        <div className="border rounded-lg overflow-hidden bg-white mt-2">
                                            {/* Task header */}
                                            <div
                                                className="p-4 flex justify-between items-center cursor-pointer bg-gray-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const containerName = `${taskGroup.Name}-container`;
                                                    setExpandedGroups({
                                                        ...expandedGroups,
                                                        [containerName]: !expandedGroups[containerName]
                                                    });
                                                }}
                                            >
                                                <div className="flex items-center">
                                                    <svg
                                                        className={`h-5 w-5 text-gray-500 transition-transform ${expandedGroups[`${taskGroup.Name}-container`] ? 'transform rotate-90' : ''}`}
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    <h5 className="text-md font-medium text-gray-900 ml-2">
                                                        {taskGroup.Tasks[0].Name}
                                                    </h5>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm text-gray-500">{taskGroup.Tasks[0].Driver}</span>
                                                    <button
                                                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                                                            selectedTaskGroup === groupIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                        }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTaskGroup(groupIndex);
                                                        }}
                                                    >
                                                        View Logs
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Task details (collapsible) */}
                                            {expandedGroups[`${taskGroup.Name}-container`] && (
                                                <div className="p-4 border-t">
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                        {/* Basic Info */}
                                                        <div className="bg-gray-50 p-4 rounded-md">
                                                            <h6 className="text-sm font-medium text-gray-700 mb-2">Task Details</h6>
                                                            <dl className="divide-y divide-gray-200">
                                                                <div className="py-2 grid grid-cols-2">
                                                                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                                                                    <dd className="text-sm text-gray-900">{taskGroup.Tasks[0].Name}</dd>
                                                                </div>
                                                                <div className="py-2 grid grid-cols-2">
                                                                    <dt className="text-sm font-medium text-gray-500">Driver</dt>
                                                                    <dd className="text-sm text-gray-900">{taskGroup.Tasks[0].Driver}</dd>
                                                                </div>
                                                                <div className="py-2 grid grid-cols-2">
                                                                    <dt className="text-sm font-medium text-gray-500">Image</dt>
                                                                    <dd className="text-sm text-gray-900 break-words">{taskGroup.Tasks[0].Config?.image || '-'}</dd>
                                                                </div>
                                                                {taskGroup.Tasks[0].Leader && (
                                                                    <div className="py-2 grid grid-cols-2">
                                                                        <dt className="text-sm font-medium text-gray-500">Leader</dt>
                                                                        <dd className="text-sm text-gray-900">Yes</dd>
                                                                    </div>
                                                                )}
                                                            </dl>
                                                        </div>

                                                        {/* Resources */}
                                                        <div className="bg-gray-50 p-4 rounded-md">
                                                            <h6 className="text-sm font-medium text-gray-700 mb-2">Resources</h6>
                                                            <dl className="divide-y divide-gray-200">
                                                                <div className="py-2 grid grid-cols-2">
                                                                    <dt className="text-sm font-medium text-gray-500">CPU</dt>
                                                                    <dd className="text-sm text-gray-900">{taskGroup.Tasks[0].Resources?.CPU || 0} MHz</dd>
                                                                </div>
                                                                <div className="py-2 grid grid-cols-2">
                                                                    <dt className="text-sm font-medium text-gray-500">Memory</dt>
                                                                    <dd className="text-sm text-gray-900">{taskGroup.Tasks[0].Resources?.MemoryMB || 0} MB</dd>
                                                                </div>
                                                                <div className="py-2 grid grid-cols-2">
                                                                    <dt className="text-sm font-medium text-gray-500">Disk</dt>
                                                                    <dd className="text-sm text-gray-900">{taskGroup.Tasks[0].Resources?.DiskMB || 0} MB</dd>
                                                                </div>
                                                            </dl>
                                                        </div>

                                                        {/* Environment Variables */}
                                                        <div className="bg-gray-50 p-4 rounded-md">
                                                            <h6 className="text-sm font-medium text-gray-700 mb-2">Environment Variables</h6>
                                                            {taskGroup.Tasks[0].Env && Object.keys(taskGroup.Tasks[0].Env).length > 0 ? (
                                                                <EnvironmentVariableDisplay envVars={taskGroup.Tasks[0].Env} />
                                                            ) : (
                                                                <p className="text-sm text-gray-500">No environment variables defined</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Additional Config */}
                                                    {taskGroup.Tasks[0].Config && Object.keys(taskGroup.Tasks[0].Config).filter(key => key !== 'image' && key !== 'auth').length > 0 && (
                                                        <div className="mt-4 bg-gray-50 p-4 rounded-md">
                                                            <h6 className="text-sm font-medium text-gray-700 mb-2">Additional Configuration</h6>
                                                            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                                                                {JSON.stringify(
                                                                    Object.entries(taskGroup.Tasks[0].Config)
                                                                        .filter(([key]) => key !== 'image' && key !== 'auth')
                                                                        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}),
                                                                    null, 2
                                                                )}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Logs */}
                <div className="mt-6">
                    {job.TaskGroups && job.TaskGroups.length > 0 && job.TaskGroups[selectedTaskGroup]?.Tasks && job.TaskGroups[selectedTaskGroup].Tasks.length > 0 && (
                        <JobLogs
                            jobId={job.ID}
                            taskName={job.TaskGroups[selectedTaskGroup].Tasks[0]?.Name}
                        />
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                    <div className="flex space-x-4">
                        <JobActions
                            jobId={job.ID}
                            jobStatus={job.Status}
                            onStatusChange={handleStatusChange}
                        />
                    </div>
                    <button
                        onClick={() => router.push('/jobs')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Back
                    </button>
                </div>
            </div>
        </ProtectedLayout>
    );
}
