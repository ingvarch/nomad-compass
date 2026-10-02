import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NodeDetailPage from './NodeDetailPage';
import { ToastProvider } from '../context/ToastContext';
import { mockFetch, type FetchCall } from '../../test/mockFetch';
import type { NomadNodeDetail, NomadAllocation } from '../types/nomad';

afterEach(() => {
  cleanup();
});

const mockReadyNode: NomadNodeDetail = {
  ID: 'node-test-1',
  Name: 'worker-primary-1',
  Status: 'ready',
  SchedulingEligibility: 'eligible',
  Drain: false,
  Datacenter: 'dc1',
  NodeClass: 'standard',
  Version: '1.8.0',
  NodeResources: {
    Cpu: { CpuShares: 4000 },
    Memory: { MemoryMB: 8192 },
    Disk: { DiskMB: 20480 },
  },
};

const mockDrainingNode: NomadNodeDetail = {
  ...mockReadyNode,
  Drain: true,
  SchedulingEligibility: 'ineligible',
  DrainStrategy: {
    DrainSpec: { Deadline: 3600 * 1e9, IgnoreSystemJobs: false },
  },
};

const mockDownNode: NomadNodeDetail = {
  ...mockReadyNode,
  Status: 'down',
  SchedulingEligibility: 'ineligible',
};

const mockAllocs: NomadAllocation[] = [
  {
    ID: 'alloc-1',
    JobID: 'web-api',
    Name: 'web-api.server[0]',
    ClientStatus: 'running',
    DesiredStatus: 'run',
    NodeID: 'node-test-1',
    CreateTime: 1700000000000,
    ModifyTime: 1700000000000,
  } as unknown as NomadAllocation,
];

describe('NodeDetailPage - Node Maintenance Actions', () => {
  it('renders node details and maintenance action buttons for ready node', async () => {
    mockFetch(({ url }: FetchCall) => {
      if (url === '/api/nomad/v1/node/node-test-1') return { body: mockReadyNode };
      if (url === '/api/nomad/v1/node/node-test-1/allocations') return { body: mockAllocs };
      return undefined;
    });

    render(
      <MemoryRouter initialEntries={['/nodes/node-test-1']}>
        <ToastProvider>
          <Routes>
            <Route path="/nodes/:nodeId" element={<NodeDetailPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('worker-primary-1')).toBeTruthy();
    expect(screen.getByRole('button', { name: /drain node/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /make ineligible/i })).toBeTruthy();
  });

  it('opens drain modal and triggers drain API request on submit', async () => {
    const calls = mockFetch(({ url, method }: FetchCall) => {
      if (url === '/api/nomad/v1/node/node-test-1') return { body: mockReadyNode };
      if (url === '/api/nomad/v1/node/node-test-1/allocations') return { body: mockAllocs };
      if (url === '/api/nomad/v1/node/node-test-1/drain' && method === 'POST') {
        return { body: { NodeModifyIndex: 10 } };
      }
      return undefined;
    });

    render(
      <MemoryRouter initialEntries={['/nodes/node-test-1']}>
        <ToastProvider>
          <Routes>
            <Route path="/nodes/:nodeId" element={<NodeDetailPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('worker-primary-1')).toBeTruthy();

    // Click "Drain Node"
    const drainBtn = screen.getByRole('button', { name: /drain node/i });
    fireEvent.click(drainBtn);

    // Modal opens
    expect(screen.getByRole('heading', { name: /drain node: worker-primary-1/i })).toBeTruthy();

    // Submit modal
    const startDrainBtn = screen.getByRole('button', { name: /start drain/i });
    await act(async () => {
      fireEvent.click(startDrainBtn);
    });

    await waitFor(() => {
      const drainCall = calls.find((c) => c.url.includes('/drain') && c.method === 'POST');
      expect(drainCall).toBeDefined();
      const body = drainCall?.body as any;
      expect(body.NodeID).toBe('node-test-1');
      expect(body.DrainSpec?.Deadline).toBe(3600 * 1e9);
    });
  });

  it('cancels drain when node is currently draining', async () => {
    const calls = mockFetch(({ url, method }: FetchCall) => {
      if (url === '/api/nomad/v1/node/node-test-1') return { body: mockDrainingNode };
      if (url === '/api/nomad/v1/node/node-test-1/allocations') return { body: mockAllocs };
      if (url === '/api/nomad/v1/node/node-test-1/drain' && method === 'POST') {
        return { body: { NodeModifyIndex: 12 } };
      }
      return undefined;
    });

    render(
      <MemoryRouter initialEntries={['/nodes/node-test-1']}>
        <ToastProvider>
          <Routes>
            <Route path="/nodes/:nodeId" element={<NodeDetailPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('worker-primary-1')).toBeTruthy();

    // For a draining node, "Cancel Drain" should appear
    const cancelDrainBtn = screen.getByRole('button', { name: /cancel drain/i });
    fireEvent.click(cancelDrainBtn);

    // Confirmation dialog opens
    expect(screen.getByRole('heading', { name: /stop drain/i })).toBeTruthy();
    const confirmButtons = screen.getAllByRole('button', { name: /stop drain/i });
    const confirmBtn = confirmButtons[confirmButtons.length - 1];

    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      const cancelCall = calls.find((c) => c.url.includes('/drain') && c.method === 'POST');
      expect(cancelCall).toBeDefined();
      const body = cancelCall?.body as any;
      expect(body.NodeID).toBe('node-test-1');
      expect(body.DrainSpec).toBeNull();
      expect(body.MarkEligible).toBe(true);
    });
  });

  it('toggles node scheduling eligibility', async () => {
    const calls = mockFetch(({ url, method }: FetchCall) => {
      if (url === '/api/nomad/v1/node/node-test-1') return { body: mockReadyNode };
      if (url === '/api/nomad/v1/node/node-test-1/allocations') return { body: mockAllocs };
      if (url === '/api/nomad/v1/node/node-test-1/eligibility' && method === 'POST') {
        return { body: { NodeModifyIndex: 15 } };
      }
      return undefined;
    });

    render(
      <MemoryRouter initialEntries={['/nodes/node-test-1']}>
        <ToastProvider>
          <Routes>
            <Route path="/nodes/:nodeId" element={<NodeDetailPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('worker-primary-1')).toBeTruthy();

    const eligibilityBtn = screen.getByRole('button', { name: /make ineligible/i });
    await act(async () => {
      fireEvent.click(eligibilityBtn);
    });

    await waitFor(() => {
      const call = calls.find((c) => c.url.includes('/eligibility') && c.method === 'POST');
      expect(call).toBeDefined();
      const body = call?.body as any;
      expect(body.Eligibility).toBe('ineligible');
    });
  });

  it('allows purging a node when status is down', async () => {
    const calls = mockFetch(({ url, method }: FetchCall) => {
      if (url === '/api/nomad/v1/node/node-test-1') return { body: mockDownNode };
      if (url === '/api/nomad/v1/node/node-test-1/allocations') return { body: [] };
      if (url === '/api/nomad/v1/node/node-test-1/purge' && method === 'POST') {
        return { body: { NodeModifyIndex: 20 } };
      }
      return undefined;
    });

    render(
      <MemoryRouter initialEntries={['/nodes/node-test-1']}>
        <ToastProvider>
          <Routes>
            <Route path="/nodes/:nodeId" element={<NodeDetailPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('worker-primary-1')).toBeTruthy();

    const purgeBtn = screen.getByRole('button', { name: /purge node/i });
    fireEvent.click(purgeBtn);

    expect(screen.getByRole('heading', { name: /purge node/i })).toBeTruthy();
    const confirmButtons = screen.getAllByRole('button', { name: /purge node/i });
    const confirmBtn = confirmButtons[confirmButtons.length - 1];

    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      const purgeCall = calls.find((c) => c.url.includes('/purge') && c.method === 'POST');
      expect(purgeCall).toBeDefined();
    });
  });
});
