import { describe, it, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopologyPage from './TopologyPage';
import { mockFetch, type FetchCall } from '../../test/mockFetch';

const mockNodes = [
  {
    ID: 'node-1',
    Name: 'worker-1',
    Datacenter: 'dc1',
    Status: 'ready',
    Drain: false,
    NodeResources: {
      Cpu: { CpuShares: 4000 },
      Memory: { MemoryMB: 8192 },
    },
  },
];

const mockAllocs = [
  {
    ID: 'alloc-1',
    JobID: 'web-app',
    NodeID: 'node-1',
    ClientStatus: 'running',
    Namespace: 'default',
    AllocatedResources: {
      Tasks: {
        server: {
          Cpu: { CpuShares: 500 },
          Memory: { MemoryMB: 512 },
        },
      },
    },
  },
];

function handleTopologyFetch({ url }: FetchCall) {
  if (url.startsWith('/api/nomad/v1/nodes')) return { body: mockNodes };
  if (url.startsWith('/api/nomad/v1/allocations')) return { body: mockAllocs };
  return undefined;
}

describe('TopologyPage', () => {
  it('renders page header with glyph refresh button and no back to dashboard link', async () => {
    mockFetch(handleTopologyFetch);

    render(
      <MemoryRouter>
        <TopologyPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Cluster Topology')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeTruthy();
    // Verify "Back to Dashboard" is NOT rendered
    expect(screen.queryByText(/Back to Dashboard/i)).toBeNull();
  });

  it('renders filter dropdowns and view mode toggle buttons', async () => {
    mockFetch(handleTopologyFetch);

    render(
      <MemoryRouter>
        <TopologyPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Datacenter').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Group By')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Grid view/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /List view/i })).toBeTruthy();
    });
  });

  it('switches view mode between grid and list', async () => {
    mockFetch(handleTopologyFetch);

    render(
      <MemoryRouter>
        <TopologyPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('worker-1')).toBeTruthy();
    });

    const listViewBtn = screen.getByRole('button', { name: /List view/i });
    fireEvent.click(listViewBtn);

    // List view should still show worker-1
    expect(screen.getByText('worker-1')).toBeTruthy();
  });
});
