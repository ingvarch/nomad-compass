import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NodesPage from './NodesPage';
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

function handleNodesFetch({ url }: FetchCall) {
  if (url.startsWith('/api/nomad/v1/nodes')) return { body: mockNodes };
  return undefined;
}

describe('NodesPage', () => {
  beforeEach(() => {
    mockFetch(handleNodesFetch);
  });

  it('renders Node Pools button as an icon-glyph without visible text and no bottom back link', async () => {
    render(
      <MemoryRouter>
        <NodesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Nodes')).toBeTruthy();

    // Verify Node Pools link button exists as an icon glyph
    const nodePoolsLink = screen.getByRole('link', { name: /node pools/i });
    expect(nodePoolsLink).toBeTruthy();
    expect(nodePoolsLink.getAttribute('href')).toBe('/node-pools');
    // Button content should be glyph svg only without text letters
    expect(nodePoolsLink.textContent?.trim()).toBe('');

    // Verify Refresh button is also glyph
    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    expect(refreshBtn).toBeTruthy();
    expect(refreshBtn.textContent?.trim()).toBe('');

    // Verify "Back to Dashboard" is NOT rendered
    expect(screen.queryByText(/Back to Dashboard/i)).toBeNull();
  });
});
