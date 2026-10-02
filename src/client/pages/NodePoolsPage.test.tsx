import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NodePoolsPage from './NodePoolsPage';
import { ToastProvider } from '../context/ToastContext';
import { mockFetch, type FetchCall } from '../../test/mockFetch';

const mockPools = [
  {
    Name: 'default',
    Description: 'Default pool for workloads',
    SchedulerConfiguration: { SchedulerAlgorithm: 'spread' },
    CreateIndex: 1,
    ModifyIndex: 1,
  },
  {
    Name: 'gpu-workers',
    Description: 'GPU accelerated nodes',
    SchedulerConfiguration: { SchedulerAlgorithm: 'binpack' },
    Meta: { type: 'gpu' },
    CreateIndex: 2,
    ModifyIndex: 3,
  },
];

const mockGpuNodes = [
  {
    ID: 'node-gpu-1',
    Name: 'gpu-worker-1',
    Status: 'ready',
    Drain: false,
    Datacenter: 'dc1',
  },
];

function handleNomadFetch({ url, method = 'GET' }: FetchCall) {
  if (url === '/api/nomad/v1/node/pools') {
    return { body: mockPools };
  }
  if (url.startsWith('/api/nomad/v1/node/pool/')) {
    if (method === 'DELETE' || method === 'POST') return { body: {} };
    if (url.endsWith('/nodes')) {
      return { body: mockGpuNodes };
    }
    return {
      body: mockPools[1],
    };
  }
  return undefined;
}

describe('NodePoolsPage', () => {
  test('renders page header and node pools list', async () => {
    mockFetch(handleNomadFetch);

    render(
      <MemoryRouter>
        <ToastProvider>
          <NodePoolsPage />
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Node Pools')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create Node Pool/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getAllByText('default').length).toBeGreaterThan(0);
      expect(screen.getAllByText('gpu-workers').length).toBeGreaterThan(0);
    });
  });

  test('filters node pools by search query', async () => {
    mockFetch(handleNomadFetch);

    render(
      <MemoryRouter>
        <ToastProvider>
          <NodePoolsPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('default').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/Search node pools by name/i);
    fireEvent.change(searchInput, { target: { value: 'gpu' } });

    expect(screen.getAllByText('gpu-workers').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('default')).toHaveLength(0);
  });

  test('opens create node pool modal when button clicked', async () => {
    mockFetch(handleNomadFetch);

    render(
      <MemoryRouter>
        <ToastProvider>
          <NodePoolsPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('default').length).toBeGreaterThan(0);
    });

    const createBtn = screen.getByRole('button', { name: /Create Node Pool/i });
    fireEvent.click(createBtn);

    expect(screen.getByRole('heading', { name: 'Create Node Pool' })).toBeTruthy();
  });

  test('opens view detail modal on pool click', async () => {
    mockFetch(handleNomadFetch);

    render(
      <MemoryRouter>
        <ToastProvider>
          <NodePoolsPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('gpu-workers').length).toBeGreaterThan(0);
    });

    const poolButtons = screen.getAllByRole('button', { name: /gpu-workers/i });
    await act(async () => {
      fireEvent.click(poolButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Node Pool: gpu-workers' })).toBeTruthy();
      expect(screen.getByText('gpu-worker-1')).toBeTruthy();
    });
  });

  test('opens delete dialog and confirms deletion', async () => {
    const calls = mockFetch(handleNomadFetch);

    render(
      <MemoryRouter>
        <ToastProvider>
          <NodePoolsPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('gpu-workers').length).toBeGreaterThan(0);
    });

    // default pool delete button is disabled; gpu-workers delete button is enabled
    const deleteBtns = screen.getAllByTitle('Delete node pool');
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByRole('heading', { name: 'Delete Node Pool' })).toBeTruthy();

    await act(async () => {
      const confirmBtn = screen.getByRole('button', { name: 'Delete Node Pool' });
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      const deleteCall = calls.find((c) => c.method === 'DELETE');
      expect(deleteCall).toBeDefined();
      expect(deleteCall?.url).toContain('/api/nomad/v1/node/pool/gpu-workers');
    });
  });
});
