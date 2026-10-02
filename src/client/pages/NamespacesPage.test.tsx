import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NamespacesPage from './NamespacesPage';
import { ToastProvider } from '../context/ToastContext';
import { HeaderActionProvider, useCurrentHeaderAction } from '../context/HeaderActionContext';
import { mockFetch, type FetchCall } from '../../test/mockFetch';

const mockNamespaces = [
  { Name: 'default', Description: 'Default shared namespace' },
  { Name: 'production', Description: 'Production workloads' },
];

const mockJobs = {
  Jobs: [
    { ID: 'web', Namespace: 'default', Status: 'running' },
  ],
};

function handleNamespacesFetch({ url }: FetchCall) {
  if (url.startsWith('/api/nomad/v1/namespaces')) return { body: mockNamespaces };
  if (url.startsWith('/api/nomad/v1/jobs')) return { body: mockJobs };
  return undefined;
}

const HeaderActionInspector = () => {
  const action = useCurrentHeaderAction();
  return <div data-testid="registered-header-action">{action?.label || 'none'}</div>;
};

describe('NamespacesPage', () => {
  beforeEach(() => {
    mockFetch(handleNamespacesFetch);
  });

  it('registers header action for mobile and hides desktop button on mobile', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <HeaderActionProvider>
            <HeaderActionInspector />
            <NamespacesPage />
          </HeaderActionProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Namespaces')).toBeTruthy();

    // Verify header action is registered for the mobile header plus button
    expect(screen.getByTestId('registered-header-action').textContent).toBe('Create Namespace');

    // Desktop create button should have hidden sm:inline-flex to hide on mobile
    const createBtn = screen.getByRole('button', { name: /create namespace/i });
    expect(createBtn.className).toContain('hidden sm:');
    const classes = createBtn.className.split(/\s+/);
    expect(classes.includes('inline-flex')).toBe(false);

    // Verify Refresh button is glyph
    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    expect(refreshBtn.textContent?.trim()).toBe('');

    // Verify "Back to Dashboard" is NOT rendered
    expect(screen.queryByText(/Back to Dashboard/i)).toBeNull();
  });
});
