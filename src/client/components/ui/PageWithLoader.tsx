import React from 'react';
import { PageHeader } from './PageHeader';
import { LoadingSpinner } from './LoadingSpinner';

interface PageWithLoaderProps {
  title: string;
  description?: string;
  loading: boolean;
  children: React.ReactNode;
}

/**
 * Wrapper component that shows a loading spinner while data is being fetched.
 * Reduces boilerplate for the common pattern of showing PageHeader + LoadingSpinner.
 */
export function PageWithLoader({
  title,
  description,
  loading,
  children,
}: PageWithLoaderProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
}
