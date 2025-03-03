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

    // Format timestamp to readable date
    const formatDate = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    // Get health check details
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
                        <div className="mb-4">
                            <h6 className="text-xs font-medium text-gray-600 mb-1">Dynamic Ports</h6>
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
                            <h6 className="text-xs font-medium text-gray-600 mb-1">Static Ports</h6>
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

    if (isLoading) {
        return (
            <ProtectedLayout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </ProtectedLayout>
        );
    }

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
                    <div>
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
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Task Groups</h3>
                        </div>
                        <div className="p-6">
                            {job.TaskGroups.map((group: any, groupIndex: number) => (
                                <div key={groupIndex} className="mb-6 last:mb-0">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-md font-medium text-gray-800 mb-2">
                                            {group.Name}
                                        </h4>
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                            Count: {group.Count}
                                        </span>
                                    </div>

                                    {/* Network Configuration */}
                                    {getNetworkConfig(group)}

                                    {/* Health Checks */}
                                    {getHealthChecks(group)}

                                    {/* Tasks */}
                                    {group.Tasks && group.Tasks.length > 0 && (
                                        <div className="mt-4">
                                            <h5 className="text-sm font-medium text-gray-700 mb-2">Tasks</h5>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                    <tr>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Name
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Driver
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Image
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Resources
                                                        </th>
                                                    </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                    {group.Tasks.map((task: any, taskIndex: number) => (
                                                        <tr key={taskIndex}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {task.Name}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {task.Driver}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {task.Config && task.Config.image}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {task.Resources && (
                                                                    <div>
                                                                        <span className="mr-2">CPU: {task.Resources.CPU} MHz</span>
                                                                        <span className="mr-2">Memory: {task.Resources.MemoryMB} MB</span>
                                                                        {task.Resources.DiskMB && <span>Disk: {task.Resources.DiskMB} MB</span>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Environment Variables */}
                                    {group.Tasks && group.Tasks.some((task: any) => task.Env && Object.keys(task.Env).length > 0) && (
                                        <div className="mt-4">
                                            <h5 className="text-sm font-medium text-gray-700 mb-2">Environment Variables</h5>
                                            <div className="bg-white shadow rounded-lg overflow-hidden">
                                                <div className="p-6">
                                                    {group.Tasks.map((task: any, taskIndex: number) => (
                                                        task.Env && Object.keys(task.Env).length > 0 && (
                                                            <div key={taskIndex} className="mb-4 last:mb-0">
                                                                <div className="text-sm font-medium text-gray-700 mb-2">{task.Name}</div>
                                                                <EnvironmentVariableDisplay envVars={task.Env} />
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Logs */}
                <div className="mt-6">
                    <JobLogs jobId={job.ID} />
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                    <JobActions
                        jobId={job.ID}
                        jobStatus={job.Status}
                        onStatusChange={handleStatusChange}
                    />
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
