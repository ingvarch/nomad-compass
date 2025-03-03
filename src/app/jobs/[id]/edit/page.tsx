'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import JobEditForm from '@/components/jobs/JobEditForm';
import Link from 'next/link';

export default function EditJobPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const jobId = params.id as string;
    const namespace = searchParams.get('namespace') || 'default';

    return (
        <ProtectedLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Edit Job</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Update job configuration
                        </p>
                    </div>
                    <div>
                        <Link
                            href={`/jobs/${jobId}?namespace=${namespace}`}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Back to Job
                        </Link>
                    </div>
                </div>

                <JobEditForm jobId={jobId} namespace={namespace} />
            </div>
        </ProtectedLayout>
    );
}
