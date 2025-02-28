'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createNomadClient } from '@/lib/api/nomad';
import { NomadJob, NomadNamespace } from '@/types/nomad';
import Link from 'next/link';

export const JobList: React.FC = () => {
  const [jobs, setJobs] = useState<NomadJob[]>([]);
  const [namespaces, setNamespaces] = useState<NomadNamespace[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('*');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, nomadAddr } = useAuth();

  // Fetch namespaces and jobs
  useEffect(() => {
    const fetchNamespacesAndJobs = async () => {
      if (!token || !nomadAddr) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      try {
        const client = createNomadClient(nomadAddr, token);

        // Fetch namespaces first
        const nsResponse = await client.getNamespaces();
        const sortedNamespaces = [
          { Name: '*', Description: 'All Namespaces' },
          ...nsResponse.sort((a, b) => a.Name.localeCompare(b.Name))
        ];
        setNamespaces(sortedNamespaces);

        // Fetch jobs
        const jobsResponse = await client.getJobs(selectedNamespace);
        setJobs(jobsResponse.Jobs || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch namespaces or jobs:', err);
        setError('Failed to load namespaces or jobs. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNamespacesAndJobs();
  }, [token, nomadAddr, selectedNamespace]);

  // Function to get status color
  const getStatusColor = (status: string, stop: boolean): string => {
    if (stop) {
      return 'text-gray-600 bg-gray-100';
    }

    switch (status.toLowerCase()) {
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'dead':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Handle namespace change
  const handleNamespaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNamespace(e.target.value);
  };

  // Render loading state
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  // Render error state
  if (error) {
    return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
    );
  }

  return (
      <div>
        {/* Namespace Filter */}
        <div className="mb-4 flex items-center space-x-4">
          <label htmlFor="namespace-select" className="text-sm font-medium text-gray-700">
            Namespace:
          </label>
          <select
              id="namespace-select"
              value={selectedNamespace}
              onChange={handleNamespaceChange}
              className="block w-auto pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          >
            {namespaces.map((ns) => (
                <option key={ns.Name} value={ns.Name}>
                  {ns.Name === '*' ? 'All Namespaces' : ns.Name}
                </option>
            ))}
          </select>
        </div>

        {/* Job List Table */}
        {jobs.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    No jobs found {selectedNamespace !== '*' ? `in ${selectedNamespace} namespace` : ''}
                  </p>
                </div>
              </div>
            </div>
        ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-100 border-b">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name / ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Namespace
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Node Pool
                    </th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {jobs.map((job) => (
                      <tr key={job.ID} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                <Link
                                    href={`/jobs/${job.ID}?namespace=${job.Namespace || 'default'}`}
                                    className="text-blue-600 hover:text-blue-800">
                                  {job.Name}
                                </Link>
                              </div>
                              <div className="text-xs text-gray-500">{job.ID}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {job.Namespace || 'default'}
                        </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(job.Status, job.Stop)}`}>
                        {job.Status} {job.Stop ? '(Stopped)' : ''}
                      </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{job.Type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">default</div>
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
};

export default JobList;
