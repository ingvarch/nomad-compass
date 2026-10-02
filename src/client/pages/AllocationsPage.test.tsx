import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AllocationsPage from './AllocationsPage';
import { mockFetch, type FetchCall } from '../../test/mockFetch';
import { ToastProvider } from '../context/ToastContext';

afterEach(() => {
  cleanup();
});

const mockAllocations = [
  {
    ID: 'alloc-1',
    JobID: 'controller',
    Namespace: 'default',
    ClientStatus: 'running',
    TaskStates: {
      server: {
        State: 'running',
        Restarts: 0,
      },
    },
  },
];

const mockJobs = [
  {
    ID: 'controller',
    Name: 'controller',
    Type: 'service',
    Priority: 50,
    Status: 'running',
    Namespace: 'default',
  },
];

function handleAllocationsFetch({ url }: FetchCall) {
  if (url.startsWith('/api/nomad/v1/allocations')) return { body: mockAllocations };
  if (url.startsWith('/api/nomad/v1/jobs')) return { body: mockJobs };
  return undefined;
}

function renderPage() {
  render(
    <MemoryRouter>
      <ToastProvider>
        <AllocationsPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('AllocationsPage', () => {
  let calls: FetchCall[];

  beforeEach(() => {
    calls = mockFetch(handleAllocationsFetch);
  });

  it('renders page header with icon-only refresh button and no bottom back link', async () => {
    renderPage();

    expect(await screen.findByText('Allocations')).toBeTruthy();

    // Verify refresh button is rendered as icon-glyph without visible text
    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    expect(refreshBtn).toBeTruthy();
    expect(refreshBtn.textContent?.trim()).toBe('');

    // Verify "Back to Dashboard" is NOT rendered at the bottom
    expect(screen.queryByText(/Back to Dashboard/i)).toBeNull();
  });

  it('renders allocation lifecycle actions menu and triggers restart modal', async () => {
    renderPage();

    expect(await screen.findByText('alloc-1')).toBeTruthy();

    // Verify action menu trigger button is present
    const actionBtns = screen.getAllByRole('button', { name: /allocation actions/i });
    expect(actionBtns.length).toBeGreaterThan(0);

    // Open first menu
    fireEvent.click(actionBtns[0]);

    // Check menu options
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Restart Allocation...',
      'Send Signal...',
      'Stop Allocation',
    ]);

    // Click Restart Allocation to open modal
    fireEvent.click(screen.getByText(/Restart Allocation\.\.\./i));
    expect(screen.getByText('Restart Allocation')).toBeTruthy();
  });

  it('reloads the allocations after an action', async () => {
    renderPage();
    await screen.findByText('alloc-1');
    const listLoads = () => calls.filter((c) => c.url.startsWith('/api/nomad/v1/allocations')).length;
    const loadsBefore = listLoads();

    fireEvent.click(screen.getAllByRole('button', { name: /allocation actions/i })[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Stop Allocation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop Allocation' }));

    await waitFor(() => expect(listLoads()).toBe(loadsBefore + 1));
    expect(calls.filter((c) => c.method === 'POST').map((c) => c.url)).toEqual([
      '/api/nomad/v1/allocation/alloc-1/stop?namespace=default',
    ]);
    expect(await screen.findByText('alloc-1')).toBeTruthy();
  });
});
