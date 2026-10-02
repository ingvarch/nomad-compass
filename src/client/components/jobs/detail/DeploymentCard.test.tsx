import { describe, test, expect, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeploymentCard } from './DeploymentCard';
import type { NomadDeployment } from '../../../types/deployment';

const mockDeployment: NomadDeployment = {
  ID: 'd1234567-89ab-cdef-0123-456789abcdef',
  JobID: 'my-service',
  JobVersion: 2,
  JobModifyIndex: 10,
  JobSpecModifyIndex: 10,
  JobCreateIndex: 5,
  Status: 'running',
  StatusDescription: 'Deployment is running',
  CreateIndex: 10,
  ModifyIndex: 10,
  TaskGroups: {
    web: {
      Promoted: false,
      DesiredCanaries: 1,
      DesiredTotal: 3,
      PlacedAllocs: 1,
      HealthyAllocs: 1,
      UnhealthyAllocs: 0,
    },
  },
};

describe('DeploymentCard', () => {
  test('renders deployment status and canary information', () => {
    const handlePromote = mock(async () => {});

    render(
      <DeploymentCard
        deployment={mockDeployment}
        onPromote={handlePromote}
      />
    );

    expect(screen.getByText('Deployment')).toBeTruthy();
    expect(screen.getByText('d1234567')).toBeTruthy();
    expect(screen.getByText('running')).toBeTruthy();
    expect(screen.getByText('v2')).toBeTruthy();
    expect(screen.getByText('web')).toBeTruthy();
    expect(screen.getByText(/Awaiting Promotion/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Promote Canaries/i })).toBeTruthy();
  });

  test('opens confirmation dialog and triggers onPromote when Promote Canaries is confirmed', async () => {
    const handlePromote = mock(async () => {});

    render(
      <DeploymentCard
        deployment={mockDeployment}
        onPromote={handlePromote}
      />
    );

    const promoteBtn = screen.getByRole('button', { name: /Promote Canaries/i });
    fireEvent.click(promoteBtn);

    expect(screen.getByRole('heading', { name: 'Promote Canary Deployment' })).toBeTruthy();

    const confirmBtns = screen.getAllByRole('button', { name: 'Promote Canaries' });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(handlePromote).toHaveBeenCalledWith({ all: true });
    });
  });

  test('calls onPause and onFail callbacks', async () => {
    const handlePromote = mock(async () => {});
    const handlePause = mock(async () => {});
    const handleFail = mock(async () => {});

    render(
      <DeploymentCard
        deployment={mockDeployment}
        onPromote={handlePromote}
        onPause={handlePause}
        onFail={handleFail}
      />
    );

    const pauseBtn = screen.getByRole('button', { name: /Pause/i });
    fireEvent.click(pauseBtn);
    expect(handlePause).toHaveBeenCalledWith(true);

    const failBtn = screen.getByRole('button', { name: /Fail/i });
    fireEvent.click(failBtn);

    expect(screen.getByRole('heading', { name: 'Fail Deployment' })).toBeTruthy();
    const confirmFailBtn = screen.getByRole('button', { name: 'Fail Deployment' });
    fireEvent.click(confirmFailBtn);

    await waitFor(() => {
      expect(handleFail).toHaveBeenCalled();
    });
  });

  test('hides Promote Canaries button when all canaries are already promoted', () => {
    const handlePromote = mock(async () => {});

    const promotedDeployment: NomadDeployment = {
      ...mockDeployment,
      TaskGroups: {
        web: {
          Promoted: true,
          DesiredCanaries: 1,
          DesiredTotal: 3,
          PlacedAllocs: 3,
          HealthyAllocs: 3,
          UnhealthyAllocs: 0,
        },
      },
    };

    render(
      <DeploymentCard
        deployment={promotedDeployment}
        onPromote={handlePromote}
      />
    );

    expect(screen.queryByRole('button', { name: /Promote Canaries/i })).toBeNull();
    expect(screen.getByText('Canaries Promoted')).toBeTruthy();
  });
});
