'use client';

import React from 'react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import JobCreateForm from '@/components/jobs/JobCreateForm';
import Link from 'next/link';

export default function CreateJobPage() {
    return (
        <ProtectedLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Create New Job</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Create a new job to run in your Nomad cluster
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

                <JobCreateForm />
            </div>
        </ProtectedLayout>
    );
}
