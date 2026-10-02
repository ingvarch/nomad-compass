import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TaskSignalModal } from './TaskSignalModal';
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
    sidecar: {
      State: 'running',
      Failed: false,
      Restarts: 0,
    },
  },
};

describe('TaskSignalModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <TaskSignalModal
        isOpen={false}
        allocation={mockAllocation}
        onClose={() => {}}
        onConfirm={async () => {}}
      />
    );

    expect(screen.queryByText(/Send Signal to Task/i)).toBeNull();
  });

  it('renders with task and signal options and submits selection', async () => {
    let submittedTask = '';
    let submittedSignal = '';

    render(
      <TaskSignalModal
        isOpen={true}
        allocation={mockAllocation}
        onClose={() => {}}
        onConfirm={async (task, signal) => {
          submittedTask = task;
          submittedSignal = signal;
        }}
      />
    );

    expect(screen.getByText(/Send Signal to Task/i)).toBeTruthy();
    expect(screen.getByLabelText(/Task/i)).toBeTruthy();
    expect(screen.getByLabelText(/Signal/i)).toBeTruthy();

    // Default task is the first task ("web"), default signal is "SIGHUP"
    const taskSelect = screen.getByLabelText(/Task/i) as HTMLSelectElement;
    expect(taskSelect.value).toBe('web');

    // Change task to "sidecar"
    fireEvent.change(taskSelect, { target: { value: 'sidecar' } });
    expect(taskSelect.value).toBe('sidecar');

    // Change signal to "SIGTERM"
    const signalSelect = screen.getByLabelText(/Signal/i) as HTMLSelectElement;
    fireEvent.change(signalSelect, { target: { value: 'SIGTERM' } });
    expect(signalSelect.value).toBe('SIGTERM');

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Send Signal/i });
    fireEvent.click(submitBtn);

    expect(submittedTask).toBe('sidecar');
    expect(submittedSignal).toBe('SIGTERM');
  });

  it('calls onClose when Cancel is clicked', () => {
    let closed = false;
    render(
      <TaskSignalModal
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
