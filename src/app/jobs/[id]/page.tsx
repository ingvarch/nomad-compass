'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import JobLogs from '@/components/jobs/JobLogs';
import JobActions from '@/components/jobs/JobActions';

export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { token, nomadAddr } = useAuth();
    const [job, setJob] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const jobId = params.id as string;

    useEffect(() => {
        const fetchJobDetail = async () => {
            if (!token || !nomadAddr) {
                setError('Authentication required');
                setIsLoading(false);
                return;
            }

            try {
                const client = createNomadClient(nomadAddr, token);
                const jobDetail = await client.getJob(jobId);
                setJob(jobDetail);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch job details:', err);
                setError('Failed to load job details. Please check your connection and try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchJobDetail();
    }, [token, nomadAddr, jobId]);

    // Format timestamp to readable date
    const formatDate = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleString();
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
                        <p className="mt-1 text-sm text-gray-600">
                            Job ID: {job.ID}
                        </p>
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
                                        {job.Namespace || 'default'}
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
                                    <h4 className="text-md font-medium text-gray-800 mb-2">
                                        {group.Name} <span className="text-sm font-normal text-gray-500">(Count: {group.Count})</span>
                                    </h4>

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
                                            <div className="bg-gray-50 p-4 rounded-md">
                                                {group.Tasks.map((task: any, taskIndex: number) => (
                                                    task.Env && Object.keys(task.Env).length > 0 && (
                                                        <div key={taskIndex} className="mb-2 last:mb-0">
                                                            <div className="text-xs font-medium text-gray-500 mb-1">{task.Name}:</div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                                {Object.entries(task.Env).map(([key, value]: [string, any], envIndex: number) => (
                                                                    <div key={envIndex} className="text-sm text-gray-700">
                                                                        <span className="font-medium">{key}</span>: {value}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                ))}
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
                    <JobActions jobId={job.ID} jobStatus={job.Status} />
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
