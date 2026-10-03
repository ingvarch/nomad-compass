// src/client/App.tsx
import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary, LoadingSpinner } from './components/ui';
import { ToastContainer } from './components/ui/Toast';
import ProtectedLayout from './components/layout/ProtectedLayout';

// Lazy-loaded Pages for route-based code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const JobDetailPage = lazy(() => import('./pages/JobDetailPage'));
const JobCreatePage = lazy(() => import('./pages/JobCreatePage'));
const JobEditPage = lazy(() => import('./pages/JobEditPage'));
const FailedAllocationsPage = lazy(() => import('./pages/FailedAllocationsPage'));
const NodesPage = lazy(() => import('./pages/NodesPage'));
const NodeDetailPage = lazy(() => import('./pages/NodeDetailPage'));
const ServersPage = lazy(() => import('./pages/ServersPage'));
const AllocationsPage = lazy(() => import('./pages/AllocationsPage'));
const AllocationFilesPage = lazy(() => import('./pages/AllocationFilesPage'));
const StoragePage = lazy(() => import('./pages/StoragePage'));
const CSIVolumePage = lazy(() => import('./pages/CSIVolumePage'));
const CSIPluginPage = lazy(() => import('./pages/CSIPluginPage'));
const NamespacesPage = lazy(() => import('./pages/NamespacesPage'));
const VariablesPage = lazy(() => import('./pages/VariablesPage'));
const NodePoolsPage = lazy(() => import('./pages/NodePoolsPage'));
const TopologyPage = lazy(() => import('./pages/TopologyPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const AclPage = lazy(() => import('./pages/AclPage'));
const ExecPage = lazy(() => import('./pages/ExecPage'));

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <LoadingSpinner />
  </div>
);

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: '/auth/login',
    element: withSuspense(LoginPage),
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        element: withSuspense(DashboardPage),
      },
      {
        path: '/jobs',
        element: withSuspense(JobsPage),
      },
      {
        path: '/jobs/create',
        element: withSuspense(JobCreatePage),
      },
      {
        path: '/jobs/:id',
        element: withSuspense(JobDetailPage),
      },
      {
        path: '/jobs/:id/edit',
        element: withSuspense(JobEditPage),
      },
      {
        path: '/allocations/failed',
        element: withSuspense(FailedAllocationsPage),
      },
      {
        path: '/allocations',
        element: withSuspense(AllocationsPage),
      },
      {
        path: '/allocations/:allocId/files',
        element: withSuspense(AllocationFilesPage),
      },
      {
        path: '/storage',
        element: withSuspense(StoragePage),
      },
      {
        path: '/storage/volumes/:volumeId',
        element: withSuspense(CSIVolumePage),
      },
      {
        path: '/storage/plugins/:pluginId',
        element: withSuspense(CSIPluginPage),
      },
      {
        path: '/nodes',
        element: withSuspense(NodesPage),
      },
      {
        path: '/nodes/:nodeId',
        element: withSuspense(NodeDetailPage),
      },
      {
        path: '/node-pools',
        element: withSuspense(NodePoolsPage),
      },
      {
        path: '/servers',
        element: withSuspense(ServersPage),
      },
      {
        path: '/namespaces',
        element: withSuspense(NamespacesPage),
      },
      {
        path: '/variables',
        element: withSuspense(VariablesPage),
      },
      {
        path: '/topology',
        element: withSuspense(TopologyPage),
      },
      {
        path: '/activity',
        element: withSuspense(ActivityPage),
      },
      {
        path: '/acl',
        element: withSuspense(AclPage),
      },
      {
        path: '/exec/:allocId/:task',
        element: withSuspense(ExecPage),
      },
    ],
  },
]);

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ToastContainer />
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
