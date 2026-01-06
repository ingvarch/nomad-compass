// src/client/App.tsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ui';
import ProtectedLayout from './components/layout/ProtectedLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import JobCreatePage from './pages/JobCreatePage';
import JobEditPage from './pages/JobEditPage';
import FailedAllocationsPage from './pages/FailedAllocationsPage';
import NodesPage from './pages/NodesPage';
import NodeDetailPage from './pages/NodeDetailPage';
import ServersPage from './pages/ServersPage';
import AllocationsPage from './pages/AllocationsPage';
import NamespacesPage from './pages/NamespacesPage';
import TopologyPage from './pages/TopologyPage';
import ActivityPage from './pages/ActivityPage';
import AclPage from './pages/AclPage';

const router = createBrowserRouter([
  {
    path: '/auth/login',
    element: <LoginPage />,
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
        element: <DashboardPage />,
      },
      {
        path: '/jobs',
        element: <JobsPage />,
      },
      {
        path: '/jobs/create',
        element: <JobCreatePage />,
      },
      {
        path: '/jobs/:id',
        element: <JobDetailPage />,
      },
      {
        path: '/jobs/:id/edit',
        element: <JobEditPage />,
      },
      {
        path: '/allocations/failed',
        element: <FailedAllocationsPage />,
      },
      {
        path: '/allocations',
        element: <AllocationsPage />,
      },
      {
        path: '/nodes',
        element: <NodesPage />,
      },
      {
        path: '/nodes/:nodeId',
        element: <NodeDetailPage />,
      },
      {
        path: '/servers',
        element: <ServersPage />,
      },
      {
        path: '/namespaces',
        element: <NamespacesPage />,
      },
      {
        path: '/topology',
        element: <TopologyPage />,
      },
      {
        path: '/activity',
        element: <ActivityPage />,
      },
      {
        path: '/acl',
        element: <AclPage />,
      },
    ],
  },
]);

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
