import { describe, it, expect, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RestartAllocationModal } from './RestartAllocationModal';
import type { NomadAllocation } from '../../types/nomad';

afterEach(() => {
  cleanup();
});

const mockAllocation: NomadAllocation = {
  ID: 'alloc-12345678-abcd',
  EvalID: 'eval-1',
  Name: 'my-job.group[0]',
  Namespace: 'default',
  NodeID: 'node-1',
  NodeName: 'worker-1',
  JobID: 'my-job',
  JobType: 'service',
  JobVersion: 1,
  TaskGroup: 'group',
  ClientStatus: 'running',
  DesiredStatus: 'run',
  CreateTime: 1000,
  ModifyTime: 2000,
  CreateIndex: 1,
  ModifyIndex: 2,
  TaskStates: {
    web: {
      State: 'running',
      Failed: false,
      Restarts: 0,
    },
    redis: {
      State: 'running',
      Failed: false,
      Restarts: 0,
    },
  },
};

describe('RestartAllocationModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <RestartAllocationModal
        isOpen={false}
        allocation={mockAllocation}
        onClose={() => {}}
        onConfirm={async () => {}}
      />
    );

    expect(screen.queryByText(/Restart Allocation/i)).toBeNull();
  });

  it('restarts all running tasks by default', () => {
    const restarted: (string | undefined)[] = [];

    render(
      <RestartAllocationModal
        isOpen={true}
        allocation={mockAllocation}
        onClose={() => {}}
        onConfirm={async (taskName) => {
          restarted.push(taskName);
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Restart Allocation' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Restart$/i }));

    expect(restarted).toEqual([undefined]);
  });

  it('restarts the selected task', () => {
    const restarted: (string | undefined)[] = [];

    render(
      <RestartAllocationModal
        isOpen={true}
        allocation={mockAllocation}
        onClose={() => {}}
        onConfirm={async (taskName) => {
          restarted.push(taskName);
        }}
      />
    );

    const taskSelect = screen.getByLabelText(/Scope/i) as HTMLSelectElement;
    fireEvent.change(taskSelect, { target: { value: 'redis' } });
    expect(taskSelect.value).toBe('redis');

    fireEvent.click(screen.getByRole('button', { name: /^Restart$/i }));

    expect(restarted).toEqual(['redis']);
  });

  // Nomad restarts in place and has no shutdown delay to skip
  it('offers no shutdown delay option', () => {
    render(
      <RestartAllocationModal
        isOpen={true}
        allocation={mockAllocation}
        onClose={() => {}}
        onConfirm={async () => {}}
      />
    );

    expect(screen.queryByLabelText(/No shutdown delay/i)).toBeNull();
  });

  it('calls onClose when Cancel is clicked', () => {
    let closed = false;
    render(
      <RestartAllocationModal
        isOpen={true}
        allocation={mockAllocation}
        onClose={() => {
          closed = true;
        }}
        onConfirm={async () => {}}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(closed).toBe(true);
  });
});
