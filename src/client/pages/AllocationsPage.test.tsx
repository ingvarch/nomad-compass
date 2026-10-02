import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AllocationsPage from './AllocationsPage';
import { mockFetch, type FetchCall } from '../../test/mockFetch';

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

const mockJobs = {
  Jobs: [
    {
      ID: 'controller',
      Name: 'controller',
      Type: 'service',
      Priority: 50,
      Status: 'running',
      Namespace: 'default',
    },
  ],
};

function handleAllocationsFetch({ url }: FetchCall) {
  if (url.startsWith('/api/nomad/v1/allocations')) return { body: mockAllocations };
  if (url.startsWith('/api/nomad/v1/jobs')) return { body: mockJobs };
  return undefined;
}

describe('AllocationsPage', () => {
  beforeEach(() => {
    mockFetch(handleAllocationsFetch);
  });

  it('renders page header with icon-only refresh button and no bottom back link', async () => {
    render(
      <MemoryRouter>
        <AllocationsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Allocations')).toBeTruthy();

    // Verify refresh button is rendered as icon-glyph without visible text
    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    expect(refreshBtn).toBeTruthy();
    expect(refreshBtn.textContent?.trim()).toBe('');

    // Verify "Back to Dashboard" is NOT rendered at the bottom
    expect(screen.queryByText(/Back to Dashboard/i)).toBeNull();
  });
});
