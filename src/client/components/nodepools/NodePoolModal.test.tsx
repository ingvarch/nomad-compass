import { describe, test, expect, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NodePoolModal } from './NodePoolModal';
import type { NomadNodePool } from '../../types/nodepools';

describe('NodePoolModal', () => {
  test('renders create form correctly', () => {
    const handleClose = mock(() => {});
    const handleSave = mock(async () => {});

    render(
      <NodePoolModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    expect(screen.getByRole('heading', { name: 'Create Node Pool' })).toBeTruthy();
    expect(screen.getByPlaceholderText(/e\.g\. gpu-workers/i)).toBeTruthy();
    expect(screen.getByText(/Scheduler Algorithm/i)).toBeTruthy();
  });

  test('submits valid data when form is saved', async () => {
    const handleClose = mock(() => {});
    const handleSave = mock(async () => {});

    render(
      <NodePoolModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. gpu-workers/i);
    const descInput = screen.getByPlaceholderText(/Dedicated high-memory compute pool/i);

    fireEvent.change(nameInput, { target: { value: 'batch-pool' } });
    fireEvent.change(descInput, { target: { value: 'Batch compute cluster' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Node Pool' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith({
        Name: 'batch-pool',
        Description: 'Batch compute cluster',
        SchedulerConfiguration: {
          SchedulerAlgorithm: 'spread',
        },
        Meta: undefined,
      });
      expect(handleClose).toHaveBeenCalled();
    });
  });

  test('renders edit mode with initial pool data and disabled name', () => {
    const handleClose = mock(() => {});
    const handleSave = mock(async () => {});

    const pool: NomadNodePool = {
      Name: 'prod-eng',
      Description: 'Production engineering',
      SchedulerConfiguration: {
        SchedulerAlgorithm: 'binpack',
      },
      Meta: { team: 'engineering' },
    };

    render(
      <NodePoolModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        initialPool={pool}
      />
    );

    expect(screen.getByRole('heading', { name: 'Edit Node Pool: prod-eng' })).toBeTruthy();
    const nameInput = screen.getByDisplayValue('prod-eng') as HTMLInputElement;
    expect(nameInput.disabled).toBe(true);
    expect(screen.getByDisplayValue('Production engineering')).toBeTruthy();
    expect(screen.getByDisplayValue('engineering')).toBeTruthy();
  });
});
