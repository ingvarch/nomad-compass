'use client';

import React from 'react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import JobList from '@/components/jobs/JobList';

export default function JobsPage() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nomad Jobs</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage jobs running in your Nomad cluster
          </p>
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