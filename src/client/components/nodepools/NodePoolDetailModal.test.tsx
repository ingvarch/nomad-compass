import { describe, test, expect, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NodePoolDetailModal } from './NodePoolDetailModal';
import { mockFetch } from '../../../test/mockFetch';
import type { NomadNodePool } from '../../types/nodepools';

const mockPool: NomadNodePool = {
  Name: 'prod-eng',
  Description: 'Production engineering pool',
  SchedulerConfiguration: {
    SchedulerAlgorithm: 'binpack',
  },
  Meta: { env: 'production', tier: 'high' },
};

const mockNodes = [
  {
    ID: 'node-1-id',
    Name: 'worker-prod-1',
    Status: 'ready',
    Drain: false,
    Datacenter: 'dc1',
    NodeResources: {
      Cpu: { CpuShares: 4000 },
      Memory: { MemoryMB: 8192 },
      Disk: { DiskMB: 20000 },
    },
  },
];

describe('NodePoolDetailModal', () => {
  test('renders pool details and fetches assigned nodes', async () => {
    mockFetch((req) => {
      if (req.url.includes('/api/nomad/v1/node/pool/prod-eng/nodes')) {
        return { body: mockNodes };
      }
      return undefined;
    });

    const handleClose = mock(() => {});
    const handleEdit = mock(() => {});
    const handleDelete = mock(() => {});

    render(
      <MemoryRouter>
        <NodePoolDetailModal
          pool={mockPool}
          isOpen={true}
          onClose={handleClose}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Node Pool: prod-eng' })).toBeTruthy();
    expect(screen.getByText('Production engineering pool')).toBeTruthy();
    expect(screen.getByText('binpack')).toBeTruthy();
    expect(screen.getByText('production')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('worker-prod-1')).toBeTruthy();
      expect(screen.getByText('node-1-id')).toBeTruthy();
    });
  });

  test('calls onEdit and onDelete callbacks', async () => {
    mockFetch(() => ({ body: [] }));

    const handleClose = mock(() => {});
    const handleEdit = mock(() => {});
    const handleDelete = mock(() => {});

    render(
      <MemoryRouter>
        <NodePoolDetailModal
          pool={mockPool}
          isOpen={true}
          onClose={handleClose}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No client nodes are currently assigned to this node pool.')).toBeTruthy();
    });

    const editBtn = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockPool);

    const deleteBtn = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith(mockPool);
  });
});
