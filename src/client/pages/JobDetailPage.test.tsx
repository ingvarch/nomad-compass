import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ToastContainer } from '../components/ui/Toast';
import { mockFetch, type FetchCall } from '../../test/mockFetch';
import { nextLaunchRefreshedIn } from '../../test/periodic';
import { formatDateLongZoned, formatIsoDateLong } from '../lib/utils/dateFormatter';
import JobDetailPage from './JobDetailPage';

const parent = {
  ID: 'backup', Name: 'backup', Namespace: 'default', Type: 'batch', Status: 'running', Stop: false,
  SubmitTime: 1790611000000000000, Version: 1, JobModifyIndex: 11, ParentID: '',
  TaskGroups: [{ Name: 'db', Count: 1, Tasks: [{ Name: 'dump', Driver: 'raw_exec', Config: { command: 'true' } }] }],
  Periodic: { Enabled: true, Spec: '', Specs: ['*/5 * * * *'], SpecType: 'cron', ProhibitOverlap: true, TimeZone: 'Europe/Berlin' },
};
const launch = {
  ID: 'backup/periodic-1790611797', ParentID: 'backup', Name: 'backup/periodic-1790611797', Namespace: 'default',
  Type: 'batch', Status: 'dead', Stop: false, Periodic: false, SubmitTime: 1790611797886474000,
};
const launchJob = { ...launch, Version: 0, JobModifyIndex: 12, TaskGroups: [], Periodic: null };
const dispatchedJob = {
  ...launchJob, ID: 'report/dispatch-1790611797-8a1b2c3d', ParentID: 'report', Name: 'report/dispatch-1790611797-8a1b2c3d',
};
const service = {
  ID: 'web', Name: 'web', Namespace: 'default', Type: 'service', Status: 'running', Stop: false,
  SubmitTime: 1790611000000000000, Version: 0, JobModifyIndex: 5, ParentID: '', TaskGroups: [],
};
// Far ahead, so the page does not read the plan again during a test
const nextLaunch = '2099-09-28T18:15:00+02:00';
const parentRoutes = {
  '/api/nomad/v1/job/backup/allocations': [],
  '/api/nomad/v1/job/backup/versions': { Versions: [] },
  '/api/nomad/v1/job/backup/plan': { NextPeriodicLaunch: nextLaunch },
  '/api/nomad/v1/jobs?': [launch],
  '/api/nomad/v1/job/backup?': parent,
};

function nomad(routes: Record<string, unknown>) {
  return ({ url }: FetchCall) => {
    if (url.startsWith('/api/auth/validate')) return { body: { authenticated: true } };
    const match = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    return match ? { body: routes[match] } : undefined;
  };
}

// Routes of a job without allocations or versions
function jobRoutes<T extends { ID: string }>(job: T) {
  const path = `/api/nomad/v1/job/${encodeURIComponent(job.ID)}`;
  return {
    [`${path}/allocations`]: [],
    [`${path}/versions`]: { Versions: [] },
    [`${path}?`]: job,
  };
}

// GET requests of the job itself, not of its allocations or versions
function jobGets(calls: FetchCall[], id: string) {
  return calls.filter((c) => c.method === 'GET' && c.url.startsWith(`/api/nomad/v1/job/${id}?`)).length;
}

function wait(ms: number) {
  return act(() => new Promise((resolve) => setTimeout(resolve, ms)));
}

type Job = typeof parent;

// Serves the parent like Nomad: registering or stopping it makes a new version that reads return.
// Reads of the changed job wait for `changedJobArrives`, so a test can check the page in between.
function mockParentJob(changedJobArrives?: Promise<void>) {
  const versions: Job[] = [parent];
  const latest = () => versions[versions.length - 1];
  const change = (job: Job) =>
    versions.push({ ...job, Version: latest().Version + 1, JobModifyIndex: latest().JobModifyIndex + 1 });

  return mockFetch(async (call) => {
    const isJob = call.url.startsWith('/api/nomad/v1/job/backup?');
    if (call.method === 'POST' && call.url === '/api/nomad/v1/jobs') change((call.body as { Job: Job }).Job);
    if (isJob && call.method === 'DELETE') {
      change({ ...latest(), Stop: true, Status: 'dead' });
      return {};
    }
    if (isJob) {
      if (versions.length > 1) await changedJobArrives;
      return { body: latest() };
    }
    if (call.url.startsWith('/api/nomad/v1/job/backup/versions')) return { body: { Versions: versions } };
    return nomad(parentRoutes)(call);
  });
}

// The schedule shows the next and the last launch: the page has read the plan and the launches
async function waitForNextAndLastLaunch() {
  await screen.findByText(formatIsoDateLong(nextLaunch));
  await screen.findByRole('link', { name: formatDateLongZoned(launch.SubmitTime) });
}

// Buttons of an action come back enabled once the action is done
function waitForEnabledButton(name: RegExp) {
  return waitFor(() => {
    const button = screen.getByRole('button', { name }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    return button;
  });
}

function isDisabled(name: string) {
  return (screen.getByRole('button', { name }) as HTMLButtonElement).disabled;
}

// Clicks Stop and confirms it in the dialog
async function stopJob() {
  fireEvent.click(await screen.findByRole('button', { name: 'Stop' }));
  const dialog = screen.getByText(/Are you sure you want to stop this job/).parentElement!;
  fireEvent.click(within(dialog).getByRole('button', { name: 'Stop' }));
}

function renderPage(route: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/jobs/:id" element={<JobDetailPage />} />
          </Routes>
        </AuthProvider>
        <ToastContainer />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('JobDetailPage for a periodic job', () => {
  test('shows the schedule, the actions and the launches', async () => {
    const calls = mockFetch(nomad(parentRoutes));
    renderPage('/jobs/backup?namespace=default');

    expect(await screen.findByText('Schedule')).toBeTruthy();
    expect(screen.getByText('*/5 * * * *')).toBeTruthy();
    expect(await screen.findByText(formatIsoDateLong(nextLaunch))).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Run now' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Logs' })).toBeNull();

    // Loading the page changes nothing: the only POST is the plan dry-run
    const posts = calls.filter((c) => c.method === 'POST').map((c) => c.url);
    expect(posts).toEqual(['/api/nomad/v1/job/backup/plan?namespace=default']);

    fireEvent.click(screen.getByRole('button', { name: 'Launches' }));
    expect(await screen.findByText('Launches (1)')).toBeTruthy();
  });

  test('when the next launch starts, shows the one after it and the new last launch', async () => {
    const plans = [nextLaunchRefreshedIn(100), nextLaunch];
    const launchLists = [[], [launch]];
    let planCount = 0;
    let listCount = 0;
    mockFetch((call) => {
      if (call.url.startsWith('/api/nomad/v1/job/backup/plan')) {
        return { body: { NextPeriodicLaunch: plans[planCount++] ?? nextLaunch } };
      }
      if (call.url.startsWith('/api/nomad/v1/jobs?')) return { body: launchLists[listCount++] ?? [launch] };
      return nomad(parentRoutes)(call);
    });
    renderPage('/jobs/backup?namespace=default');

    expect(await screen.findByText('No launches yet')).toBeTruthy();
    await waitForNextAndLastLaunch();
  });

  test('opens the overview for a tab the periodic job does not have', async () => {
    mockFetch(nomad(parentRoutes));
    renderPage('/jobs/backup?namespace=default&tab=logs');

    expect(await screen.findByText('Schedule')).toBeTruthy();
    await waitForNextAndLastLaunch();
  });

  test('a task group of a periodic job has no View Logs button', async () => {
    mockFetch(nomad(parentRoutes));
    renderPage('/jobs/backup?namespace=default');

    fireEvent.click(await screen.findByText('Task Group: db'));
    expect(screen.getByText('dump')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View Logs' })).toBeNull();
    await waitForNextAndLastLaunch();
  });

  test('a launch links to its periodic job and cannot be edited or cloned', async () => {
    mockFetch(nomad(jobRoutes(launchJob)));
    renderPage('/jobs/backup%2Fperiodic-1790611797?namespace=default');

    const parentLink = await screen.findByRole('link', { name: 'backup' });
    expect(parentLink.getAttribute('href')).toBe('/jobs/backup?namespace=default');
    expect(screen.queryByRole('link', { name: /Edit/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Clone/ })).toBeNull();
  });

  test('opening a launch does not ask for launches of the launch', async () => {
    const calls = mockFetch(nomad({ ...parentRoutes, ...jobRoutes(launchJob) }));
    renderPage('/jobs/backup?namespace=default&tab=launches');

    fireEvent.click(await screen.findByRole('link', { name: formatDateLongZoned(launch.SubmitTime) }));
    expect(await screen.findByRole('link', { name: 'backup' })).toBeTruthy();

    const launchLists = calls.filter((c) => c.url.startsWith('/api/nomad/v1/jobs?')).map((c) => c.url);
    expect(launchLists).toEqual(['/api/nomad/v1/jobs?namespace=default&prefix=backup%2Fperiodic-']);
  });

  test('run now does not reload the job', async () => {
    const calls = mockFetch(nomad({
      ...parentRoutes,
      '/api/nomad/v1/job/backup/periodic/force': { EvalID: '198c9740-1446-82a5', EvalCreateIndex: 12 },
    }));
    renderPage('/jobs/backup?namespace=default');

    const runNow = await screen.findByRole('button', { name: 'Run now' });
    const loads = jobGets(calls, 'backup');
    fireEvent.click(runNow);
    await waitFor(() => expect(calls.some((c) => c.url.includes('/periodic/force'))).toBe(true));
    await wait(50);

    expect(jobGets(calls, 'backup')).toBe(loads);
  });

  test('pause refreshes the schedule in place', async () => {
    const pausedJob = Promise.withResolvers<void>();
    mockParentJob(pausedJob.promise);
    renderPage('/jobs/backup?namespace=default');

    const heading = await screen.findByText('Schedule');
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await screen.findByText('Schedule paused');
    // A spinner while the paused job is on its way would unmount the card, heading included
    expect(heading.isConnected).toBe(true);

    pausedJob.resolve();
    expect(await screen.findByText('Paused')).toBeTruthy();
    expect(heading.isConnected).toBe(true);
  });

  test('pause keeps the button busy until the paused job arrives', async () => {
    const pausedJob = Promise.withResolvers<void>();
    mockParentJob(pausedJob.promise);
    renderPage('/jobs/backup?namespace=default');

    fireEvent.click(await screen.findByRole('button', { name: 'Pause' }));
    await screen.findByText('Schedule paused');
    // A second click now would pause the job again
    expect(isDisabled('Pause')).toBe(true);

    pausedJob.resolve();
    const toggle = await waitForEnabledButton(/^(Pause|Resume)$/);
    expect(toggle.textContent).toBe('Resume');
    expect(screen.getByText('Paused')).toBeTruthy();
  });

  test('stop keeps all job actions busy until the stopped job arrives', async () => {
    const stoppedJob = Promise.withResolvers<void>();
    mockParentJob(stoppedJob.promise);
    renderPage('/jobs/backup?namespace=default');

    await stopJob();
    await screen.findByText('Job stopped successfully');
    // Nomad has stopped the job, the stopped job is still on its way
    expect(screen.getByRole('button', { name: 'Working...' })).toBeTruthy();
    expect(isDisabled('Run now')).toBe(true);
    expect(isDisabled('Pause')).toBe(true);

    stoppedJob.resolve();
    const action = await waitForEnabledButton(/^(Stop|Start)$/);
    expect(action.textContent).toBe('Start');
    expect(screen.getByText('Stopped')).toBeTruthy();
    expect(isDisabled('Run now')).toBe(true);
    expect(isDisabled('Pause')).toBe(true);
  });

  test('pause reloads the versions tab', async () => {
    mockParentJob();
    renderPage('/jobs/backup?namespace=default&tab=versions');

    expect(await screen.findByText('Version History (1)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    expect(await screen.findByText('Version History (2)')).toBeTruthy();
  });

  test('a failed refresh keeps the page and shows the error in a toast', async () => {
    let paused = false;
    mockFetch((call) => {
      if (call.method === 'POST' && call.url === '/api/nomad/v1/jobs') paused = true;
      if (paused && call.url.startsWith('/api/nomad/v1/job/backup?')) {
        return { status: 500, body: { message: 'No cluster leader' } };
      }
      return nomad(parentRoutes)(call);
    });
    renderPage('/jobs/backup?namespace=default');

    const heading = await screen.findByText('Schedule');
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    expect(await screen.findByText('Failed to load job details: No cluster leader')).toBeTruthy();
    expect(heading.isConnected).toBe(true);
  });

  test('pause keeps an expanded task group open', async () => {
    mockParentJob();
    renderPage('/jobs/backup?namespace=default');

    fireEvent.click(await screen.findByText('Task Group: db'));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    expect(await screen.findByText('Paused')).toBeTruthy();
    expect(screen.getByText('dump')).toBeTruthy();
  });
});

describe('JobDetailPage for a child job', () => {
  // Nomad drops ParentID when a job is registered again: Start would turn the child into an ordinary job
  test.each([
    ['launch', launchJob],
    ['dispatched job', dispatchedJob],
  ])('a finished %s cannot be started again', async (_, child) => {
    mockFetch(nomad(jobRoutes(child)));
    renderPage(`/jobs/${encodeURIComponent(child.ID)}?namespace=default`);

    expect(await screen.findByText(`Job ID: ${child.ID}`)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();
    // Header and bottom actions
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
  });

  test('a dispatched job cannot be edited or cloned and is not a launch', async () => {
    mockFetch(nomad(jobRoutes(dispatchedJob)));
    renderPage(`/jobs/${encodeURIComponent(dispatchedJob.ID)}?namespace=default`);

    expect(await screen.findByText(`Job ID: ${dispatchedJob.ID}`)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Clone' })).toBeNull();
    expect(screen.queryByText(/Launch of/)).toBeNull();
  });

  test('a running launch can be stopped', async () => {
    mockFetch(nomad(jobRoutes({ ...launchJob, Status: 'running' })));
    renderPage('/jobs/backup%2Fperiodic-1790611797?namespace=default');

    expect(await screen.findByRole('button', { name: 'Stop' })).toBeTruthy();
  });
});

describe('JobDetailPage for a missing job', () => {
  test('requests the job once', async () => {
    const calls = mockFetch((call) =>
      call.url.startsWith('/api/nomad/v1/job/gone?')
        ? { status: 404, body: { message: 'job not found' } }
        : nomad({})(call)
    );
    renderPage('/jobs/gone?namespace=default');

    expect(await screen.findByText('Failed to load job details: job not found')).toBeTruthy();
    await wait(50);

    // The first render has no auth yet and requests nothing; the auth check then starts the one load
    expect(jobGets(calls, 'gone')).toBe(1);
  });
});

describe('JobDetailPage for a service job', () => {
  test('opens the overview for the Launches tab', async () => {
    mockFetch(nomad(jobRoutes(service)));
    renderPage('/jobs/web?namespace=default&tab=launches');

    expect(await screen.findByText('Job Summary')).toBeTruthy();
    expect(screen.queryByText(/^Launches \(/)).toBeNull();
  });

  test('can be edited and cloned', async () => {
    mockFetch(nomad(jobRoutes(service)));
    renderPage('/jobs/web?namespace=default');

    expect(await screen.findByRole('link', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Clone' })).toBeTruthy();
    expect(screen.queryByText(/Launch of/)).toBeNull();
  });
});
