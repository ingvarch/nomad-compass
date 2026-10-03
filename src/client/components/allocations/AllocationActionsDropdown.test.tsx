import { describe, it, expect, afterEach } from 'bun:test';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AllocationActionsDropdown } from './AllocationActionsDropdown';
import { mockFetch, type FetchCall } from '../../../test/mockFetch';
import type { NomadAllocation } from '../../types/nomad';
import { ToastProvider } from '../../context/ToastContext';
import { getPermissionErrorMessage } from '../../lib/errors';

afterEach(() => {
  cleanup();
});

const runningAllocation: NomadAllocation = {
  ID: 'alloc-11112222-3333',
  EvalID: 'eval-1',
  Name: 'api.server[0]',
  Namespace: 'default',
  NodeID: 'node-1',
  NodeName: 'node-alpha',
  JobID: 'api',
  JobType: 'service',
  JobVersion: 1,
  TaskGroup: 'server',
  ClientStatus: 'running',
  DesiredStatus: 'run',
  CreateTime: 1000,
  ModifyTime: 2000,
  CreateIndex: 1,
  ModifyIndex: 2,
  TaskStates: {
    server: {
      State: 'running',
      Failed: false,
      Restarts: 0,
    },
  },
};

const failedAllocation: NomadAllocation = {
  ...runningAllocation,
  ID: 'alloc-failed-9999',
  ClientStatus: 'failed',
  DesiredStatus: 'stop',
  TaskStates: {
    server: {
      State: 'dead',
      Failed: true,
      Restarts: 3,
    },
  },
};

const allocPath = '/api/nomad/v1/allocation/alloc-11112222-3333';
const clientAllocPath = '/api/nomad/v1/client/allocation/alloc-11112222-3333';

// Renders the actions and counts the calls of onSuccess
function renderActions(allocation: NomadAllocation) {
  const result = { successes: 0 };
  render(
    <MemoryRouter>
      <ToastProvider>
        <AllocationActionsDropdown allocation={allocation} onSuccess={() => { result.successes++; }} />
      </ToastProvider>
    </MemoryRouter>
  );
  return result;
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /allocation actions/i }));
}

function menuItems() {
  return screen.getAllByRole('menuitem').map((item) => item.textContent);
}

function chooseAction(name: string) {
  openMenu();
  fireEvent.click(screen.getByRole('menuitem', { name }));
}

function posts(calls: FetchCall[]) {
  return calls.filter((c) => c.method === 'POST');
}

describe('AllocationActionsDropdown', () => {
  it('offers exec, files, restart, signal and stop for a running allocation', () => {
    mockFetch();
    renderActions(runningAllocation);

    expect(screen.getByRole('link', { name: /exec/i })).toBeTruthy();
    // Menu is closed initially
    expect(screen.queryByRole('menuitem')).toBeNull();

    openMenu();

    expect(menuItems()).toEqual(['Browse Files', 'Restart Allocation...', 'Send Signal...', 'Stop Allocation']);
  });

  // Nomad creates the allocation directory once the allocation starts
  it('offers only stop for a pending allocation', () => {
    mockFetch();
    renderActions({ ...runningAllocation, ClientStatus: 'pending' });

    expect(screen.queryByRole('link', { name: /exec/i })).toBeNull();
    openMenu();

    expect(menuItems()).toEqual(['Stop Allocation']);
  });

  it('offers files and rescheduling for a failed allocation', () => {
    mockFetch();
    renderActions(failedAllocation);

    expect(screen.queryByRole('link', { name: /exec/i })).toBeNull();
    openMenu();

    expect(menuItems()).toEqual(['Browse Files', 'Reschedule Failed Allocations']);
  });

  // Nomad keeps the directory of a finished allocation until garbage collection
  it('offers only files for a complete allocation', () => {
    mockFetch();
    renderActions({ ...failedAllocation, ClientStatus: 'complete' });

    expect(screen.queryByRole('link', { name: /exec/i })).toBeNull();
    openMenu();

    expect(menuItems()).toEqual(['Browse Files']);
  });

  it('links Browse Files to the files of the allocation', () => {
    mockFetch();
    renderActions(runningAllocation);
    openMenu();

    expect(screen.getByRole('menuitem', { name: 'Browse Files' }).getAttribute('href')).toBe(
      '/allocations/alloc-11112222-3333/files'
    );
  });

  // The node of a lost allocation is gone with its files
  it('offers nothing for a lost allocation', () => {
    mockFetch();
    renderActions({ ...failedAllocation, ClientStatus: 'lost' });

    expect(screen.queryByRole('button', { name: /allocation actions/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /exec/i })).toBeNull();
  });

  // A dialog inside the actions cell would inherit its right alignment and nowrap
  it.each([
    ['Restart Allocation...', 'Restart Allocation'],
    ['Send Signal...', 'Send Signal to Task'],
    ['Stop Allocation', 'Stop Allocation'],
  ])('opens the dialog of "%s" outside the table cell', (action, title) => {
    mockFetch();
    render(
      <MemoryRouter>
        <ToastProvider>
          <table>
            <tbody>
              <tr>
                <td data-testid="actions-cell">
                  <AllocationActionsDropdown allocation={runningAllocation} />
                </td>
              </tr>
            </tbody>
          </table>
        </ToastProvider>
      </MemoryRouter>
    );

    chooseAction(action);

    const heading = screen.getByRole('heading', { name: title });
    expect(screen.getByTestId('actions-cell').contains(heading)).toBe(false);
  });

  it('restarts the running tasks of the allocation', async () => {
    const calls = mockFetch();
    const result = renderActions(runningAllocation);

    chooseAction('Restart Allocation...');
    fireEvent.click(screen.getByRole('button', { name: /^Restart$/i }));

    await waitFor(() => expect(result.successes).toBe(1));
    expect(posts(calls)).toEqual([
      { method: 'POST', url: `${clientAllocPath}/restart?namespace=default`, body: { TaskName: '' } },
    ]);
    expect(screen.queryByRole('heading', { name: 'Restart Allocation' })).toBeNull();
  });

  it('sends the selected signal to a task', async () => {
    const calls = mockFetch();
    const result = renderActions(runningAllocation);

    chooseAction('Send Signal...');
    fireEvent.change(screen.getByLabelText(/Signal/i), { target: { value: 'SIGUSR1' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Signal/i }));

    await waitFor(() => expect(result.successes).toBe(1));
    expect(posts(calls)).toEqual([
      {
        method: 'POST',
        url: `${clientAllocPath}/signal?namespace=default`,
        body: { Task: 'server', Signal: 'SIGUSR1' },
      },
    ]);
  });

  it('stops the allocation after a confirmation', async () => {
    const calls = mockFetch(() => ({ body: { EvalID: 'eval-stop', Index: 54 } }));
    const result = renderActions(runningAllocation);

    chooseAction('Stop Allocation');
    expect(screen.getByRole('heading', { name: 'Stop Allocation' })).toBeTruthy();
    expect(posts(calls)).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Stop Allocation' }));

    await waitFor(() => expect(result.successes).toBe(1));
    expect(posts(calls).map((c) => c.url)).toEqual([`${allocPath}/stop?namespace=default`]);
  });

  it('stops without the shutdown delay when asked', async () => {
    const calls = mockFetch();
    const result = renderActions(runningAllocation);

    chooseAction('Stop Allocation');
    fireEvent.click(screen.getByLabelText(/No shutdown delay/i));
    fireEvent.click(screen.getByRole('button', { name: 'Stop Allocation' }));

    await waitFor(() => expect(result.successes).toBe(1));
    expect(posts(calls).map((c) => c.url)).toEqual([`${allocPath}/stop?no_shutdown_delay=true&namespace=default`]);
  });

  // Like `nomad alloc stop`: without it Nomad does not replace a stopped batch allocation
  it('asks Nomad to reschedule a stopped batch allocation', async () => {
    const calls = mockFetch();
    const result = renderActions({ ...runningAllocation, JobType: 'batch' });

    chooseAction('Stop Allocation');
    fireEvent.click(screen.getByRole('button', { name: 'Stop Allocation' }));

    await waitFor(() => expect(result.successes).toBe(1));
    expect(posts(calls).map((c) => c.url)).toEqual([`${allocPath}/stop?reschedule=true&namespace=default`]);
  });

  it('reschedules the failed allocations of the job', async () => {
    const calls = mockFetch(() => ({ body: { EvalID: 'eval-resched' } }));
    const result = renderActions(failedAllocation);

    chooseAction('Reschedule Failed Allocations');
    fireEvent.click(screen.getByRole('button', { name: /^Reschedule$/i }));

    await waitFor(() => expect(result.successes).toBe(1));
    expect(posts(calls)).toEqual([
      {
        method: 'POST',
        url: '/api/nomad/v1/job/api/evaluate?namespace=default',
        body: { JobID: 'api', EvalOptions: { ForceReschedule: true } },
      },
    ]);
  });

  it('explains a permission error instead of the confirmation', async () => {
    mockFetch(() => ({ status: 403, body: { message: 'Permission denied' } }));
    const result = renderActions(runningAllocation);

    chooseAction('Stop Allocation');
    fireEvent.click(screen.getByRole('button', { name: 'Stop Allocation' }));

    expect(await screen.findByText(getPermissionErrorMessage('stop-allocation'))).toBeTruthy();
    expect(getPermissionErrorMessage('stop-allocation')).toContain('alloc-lifecycle');
    expect(screen.queryByRole('heading', { name: 'Stop Allocation' })).toBeNull();
    expect(result.successes).toBe(0);
  });
});
