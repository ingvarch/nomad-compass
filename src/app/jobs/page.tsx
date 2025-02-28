'use client';

import React from 'react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import JobList from '@/components/jobs/JobList';
import Link from 'next/link';

export default function JobsPage() {
  return (
      <ProtectedLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Nomad Jobs</h1>
              <p className="mt-1 text-sm text-gray-600">
                View and manage jobs running in your Nomad cluster
              </p>
            </div>
            <div>
              <Link
                  href="/jobs/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Job
              </Link>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <JobList />
            </div>
          </div>
        </div>
      </ProtectedLayout>
  );
}
