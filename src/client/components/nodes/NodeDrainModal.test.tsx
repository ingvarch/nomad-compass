import { describe, it, expect, mock } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeDrainModal } from './NodeDrainModal';

describe('NodeDrainModal', () => {
  const mockNode = {
    ID: 'node-abc-123',
    Name: 'worker-node-1',
    allocationsCount: 4,
  };

  it('renders modal with node information and default presets', () => {
    render(
      <NodeDrainModal
        isOpen={true}
        node={mockNode}
        onClose={() => {}}
        onConfirm={async () => {}}
      />
    );

    expect(screen.getByRole('heading', { name: /Drain Node: worker-node-1/i })).toBeTruthy();
    expect(screen.getByText(/node-abc-123/i)).toBeTruthy();
    expect(screen.getByText(/4 running allocations/i)).toBeTruthy();
    expect(screen.getByLabelText(/Ignore system jobs/i)).toBeTruthy();
  });

  it('submits with default 1h deadline and ignore system jobs', () => {
    const handleConfirm = mock(async () => {});

    render(
      <NodeDrainModal
        isOpen={true}
        node={mockNode}
        onClose={() => {}}
        onConfirm={handleConfirm}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Start Drain/i });
    fireEvent.click(submitBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleConfirm).toHaveBeenCalledWith({
      deadline: 3600 * 1e9, // 1 hour in nanoseconds
      ignoreSystemJobs: false,
    });
  });

  it('allows selecting no deadline and ignoring system jobs', () => {
    const handleConfirm = mock(async () => {});

    render(
      <NodeDrainModal
        isOpen={true}
        node={mockNode}
        onClose={() => {}}
        onConfirm={handleConfirm}
      />
    );

    // Select "No deadline" preset
    const noDeadlineBtn = screen.getByRole('button', { name: 'No deadline' });
    fireEvent.click(noDeadlineBtn);

    // Check "Ignore system jobs"
    const checkbox = screen.getByLabelText(/Ignore system jobs/i);
    fireEvent.click(checkbox);

    const submitBtn = screen.getByRole('button', { name: /Start Drain/i });
    fireEvent.click(submitBtn);

    expect(handleConfirm).toHaveBeenCalledWith({
      deadline: 0,
      ignoreSystemJobs: true,
    });
  });

  it('allows custom deadline in minutes', () => {
    const handleConfirm = mock(async () => {});

    render(
      <NodeDrainModal
        isOpen={true}
        node={mockNode}
        onClose={() => {}}
        onConfirm={handleConfirm}
      />
    );

    // Select "Custom"
    const customBtn = screen.getByRole('button', { name: 'Custom' });
    fireEvent.click(customBtn);

    // Input 45 minutes
    const input = screen.getByPlaceholderText(/Minutes/i);
    fireEvent.change(input, { target: { value: '45' } });

    const submitBtn = screen.getByRole('button', { name: /Start Drain/i });
    fireEvent.click(submitBtn);

    expect(handleConfirm).toHaveBeenCalledWith({
      deadline: 45 * 60 * 1e9,
      ignoreSystemJobs: false,
    });
  });
});
