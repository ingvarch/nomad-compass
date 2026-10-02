import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FailedAllocationsPage from './FailedAllocationsPage';
import { mockFetch, type FetchCall } from '../../test/mockFetch';
import { ToastProvider } from '../context/ToastContext';

afterEach(() => {
  cleanup();
});

const failedAllocation = {
  ID: 'alloc-failed-1',
  JobID: 'api',
  JobType: 'service',
  Namespace: 'prod',
  TaskGroup: 'server',
  ClientStatus: 'failed',
  DesiredStatus: 'run',
  ModifyTime: 1790611000000000000,
  TaskStates: {
    server: { State: 'dead', Failed: true, Restarts: 3 },
  },
};

function handleFetch({ url }: FetchCall) {
  if (url.startsWith('/api/nomad/v1/allocations')) return { body: [failedAllocation] };
  if (url.startsWith('/api/nomad/v1/jobs')) return { body: [{ ID: 'api', Name: 'api', Namespace: 'prod' }] };
  return undefined;
}

function renderPage() {
  render(
    <MemoryRouter>
      <ToastProvider>
        <FailedAllocationsPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

function actionButtons() {
  return screen.getAllByRole('button', { name: /allocation actions/i });
}

describe('FailedAllocationsPage', () => {
  let calls: FetchCall[];

  beforeEach(() => {
    calls = mockFetch(handleFetch);
  });

  it('offers the allocation actions in the table and in the mobile card', async () => {
    renderPage();
    await screen.findByText('Active Failures');

    expect(actionButtons()).toHaveLength(2);
  });

  it('reschedules the failed allocations of the job and reloads the page', async () => {
    renderPage();
    await screen.findByText('Active Failures');
    const listLoads = () => calls.filter((c) => c.url.startsWith('/api/nomad/v1/allocations')).length;
    const loadsBefore = listLoads();

    fireEvent.click(actionButtons()[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reschedule Failed Allocations' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reschedule' }));

    await waitFor(() => expect(listLoads()).toBe(loadsBefore + 1));
    expect(calls.filter((c) => c.method === 'POST')).toEqual([
      {
        method: 'POST',
        url: '/api/nomad/v1/job/api/evaluate?namespace=prod',
        body: { JobID: 'api', EvalOptions: { ForceReschedule: true } },
      },
    ]);
    expect(await screen.findByText('Active Failures')).toBeTruthy();
  });
});
