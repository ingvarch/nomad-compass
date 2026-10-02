import { describe, test, expect, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScaleTaskGroupModal } from './ScaleTaskGroupModal';
import type { NomadTaskGroup } from '../../../types/nomad';

const mockTaskGroup: NomadTaskGroup = {
  Name: 'api-servers',
  Count: 2,
  Tasks: [
    {
      Name: 'server',
      Driver: 'docker',
      Config: { image: 'my-org/api:v1' },
      Resources: { CPU: 500, MemoryMB: 256, DiskMB: 100 },
    },
  ],
};

describe('ScaleTaskGroupModal', () => {
  test('does not render when isOpen is false', () => {
    const { container } = render(
      <ScaleTaskGroupModal
        isOpen={false}
        onClose={() => {}}
        taskGroup={mockTaskGroup}
        onScale={async () => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders task group name, current count, and disabled unchanged submit button', () => {
    render(
      <ScaleTaskGroupModal
        isOpen={true}
        onClose={() => {}}
        taskGroup={mockTaskGroup}
        onScale={async () => {}}
      />
    );

    expect(screen.getByText('Scale Task Group: api-servers')).toBeTruthy();
    expect(screen.getByText('2 allocations')).toBeTruthy();
    expect(screen.getByText('Desired count is unchanged (2).')).toBeTruthy();

    const submitBtn = screen.getByRole('button', { name: 'No Change' }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  test('increments and decrements count via stepper buttons', () => {
    render(
      <ScaleTaskGroupModal
        isOpen={true}
        onClose={() => {}}
        taskGroup={mockTaskGroup}
        onScale={async () => {}}
      />
    );

    const increaseBtn = screen.getByRole('button', { name: 'Increase count' });
    const decreaseBtn = screen.getByRole('button', { name: 'Decrease count' });

    // Increase from 2 to 3
    fireEvent.click(increaseBtn);
    expect(screen.getByText(/Scale Up:/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Scale to 3' })).toBeTruthy();

    // Decrease from 3 to 2, then to 1
    fireEvent.click(decreaseBtn);
    expect(screen.getByText('Desired count is unchanged (2).')).toBeTruthy();

    fireEvent.click(decreaseBtn);
    expect(screen.getByText(/Scale Down:/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Scale to 1' })).toBeTruthy();
  });

  test('quick delta buttons adjust count and show correct preview', () => {
    render(
      <ScaleTaskGroupModal
        isOpen={true}
        onClose={() => {}}
        taskGroup={mockTaskGroup}
        onScale={async () => {}}
      />
    );

    // Click "+5" -> 2 + 5 = 7
    fireEvent.click(screen.getByRole('button', { name: '+5' }));
    expect(screen.getByRole('button', { name: 'Scale to 7' })).toBeTruthy();

    // Click "Stop All (0)" -> 0
    fireEvent.click(screen.getByRole('button', { name: 'Stop All (0)' }));
    expect(screen.getByText(/Scale to Zero:/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Scale to 0' })).toBeTruthy();

    // Click "Reset" -> 2
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Desired count is unchanged (2).')).toBeTruthy();
  });

  test('submits scaling request with custom message and closes modal', async () => {
    const onScale = mock(async () => {});
    const onClose = mock(() => {});

    render(
      <ScaleTaskGroupModal
        isOpen={true}
        onClose={onClose}
        taskGroup={mockTaskGroup}
        onScale={onScale}
      />
    );

    // Change count to 4
    fireEvent.click(screen.getByRole('button', { name: 'Increase count' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase count' }));

    // Type a message
    const messageInput = screen.getByPlaceholderText('e.g. Scaling up for high traffic');
    fireEvent.change(messageInput, { target: { value: 'traffic burst' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: 'Scale to 4' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onScale).toHaveBeenCalledWith('api-servers', 4, 'traffic burst');
      expect(onClose).toHaveBeenCalled();
    });
  });

  test('displays error message when scaling fails and leaves modal open', async () => {
    const onScale = mock(async () => {
      throw new Error('job has active deployment');
    });
    const onClose = mock(() => {});

    render(
      <ScaleTaskGroupModal
        isOpen={true}
        onClose={onClose}
        taskGroup={mockTaskGroup}
        onScale={onScale}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Increase count' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scale to 3' }));

    await waitFor(() => {
      expect(screen.getByText('job has active deployment')).toBeTruthy();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
