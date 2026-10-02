import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
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

// `extra` renders next to the page, e.g. a link to another job
function renderPage(route: string, extra?: ReactNode) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/jobs/:id" element={<JobDetailPage />} />
          </Routes>
          {extra}
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

  test('opening a job with the same ID in another namespace does not ask for launches there', async () => {
    const otherBackup = { ...service, ID: 'backup', Name: 'backup', Namespace: 'other' };
    const calls = mockFetch((call) =>
      call.url.startsWith('/api/nomad/v1/job/backup?namespace=other') ? { body: otherBackup } : nomad(parentRoutes)(call)
    );
    renderPage('/jobs/backup?namespace=default', <Link to="/jobs/backup?namespace=other">backup in other</Link>);

    await waitForNextAndLastLaunch();
    fireEvent.click(screen.getByRole('link', { name: 'backup in other' }));
    expect(await screen.findByText('Namespace: other')).toBeTruthy();

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
    expect(screen.queryByRole('button', { name: 'Dispatch' })).toBeNull();
  });
});

describe('JobDetailPage for a parameterized job', () => {
  const exportJob = {
    ...service, ID: 'export', Name: 'export', Type: 'batch',
    ParameterizedJob: { Payload: 'optional', MetaRequired: ['database'], MetaOptional: null },
  };
  const dispatchedJob = {
    ...exportJob, ID: 'export/dispatch-1790611797-8a1b2c3d', Name: 'export/dispatch-1790611797-8a1b2c3d',
    ParentID: 'export', Dispatched: true,
  };
  const dispatchReply = {
    DispatchedJobID: dispatchedJob.ID, EvalID: 'eval-1', EvalCreateIndex: 7, JobCreateIndex: 6, Index: 7,
  };
  // The dispatched job as the jobs list returns it
  const dispatchedStub = {
    ID: dispatchedJob.ID, ParentID: 'export', Name: dispatchedJob.ID, Namespace: 'default', Type: 'batch',
    Status: 'dead', Stop: false, Periodic: false, SubmitTime: 1790611797886474000,
  };
  // The job and its dispatched jobs, none yet
  const exportRoutes = { ...jobRoutes(exportJob), '/api/nomad/v1/jobs?': [] };

  // The dialog renders after the page, so its button is the last one
  function dispatchButtons() {
    return screen.getAllByRole('button', { name: 'Dispatch' });
  }

  async function dispatchWithDatabase(database: string) {
    fireEvent.click(await screen.findByRole('button', { name: 'Dispatch' }));
    fireEvent.change(screen.getByLabelText('database'), { target: { value: database } });
    fireEvent.click(dispatchButtons().at(-1)!);
  }

  // A parameterized job has no allocations of its own: its runs are the dispatched jobs
  test('has the Dispatches tab instead of the allocation tabs', async () => {
    mockFetch(nomad(exportRoutes));
    renderPage('/jobs/export?namespace=default');

    expect(await screen.findByRole('button', { name: 'Dispatches' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Versions' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Allocations' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Logs' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Exec' })).toBeNull();
  });

  test('a task group of a parameterized job has no View Logs button', async () => {
    const withGroup = { ...exportJob, TaskGroups: [{ Name: 'g', Count: 1, Tasks: [{ Name: 'run', Driver: 'raw_exec', Config: {} }] }] };
    mockFetch(nomad({ ...exportRoutes, ...jobRoutes(withGroup) }));
    renderPage('/jobs/export?namespace=default');

    fireEvent.click(await screen.findByText('Task Group: g'));
    expect(screen.getByText('run')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View Logs' })).toBeNull();
  });

  test('lists the dispatched jobs and shows a new one after a dispatch', async () => {
    let dispatched = false;
    mockFetch((call) => {
      if (call.url.startsWith('/api/nomad/v1/job/export/dispatch')) {
        dispatched = true;
        return { body: dispatchReply };
      }
      if (call.url.startsWith('/api/nomad/v1/jobs?')) return { body: dispatched ? [dispatchedStub] : [] };
      return nomad(exportRoutes)(call);
    });
    renderPage('/jobs/export?namespace=default&tab=dispatches');

    expect(await screen.findByText('Dispatches (0)')).toBeTruthy();
    await dispatchWithDatabase('orders');

    expect(await screen.findByText('Dispatches (1)')).toBeTruthy();
    const listed = screen.getByRole('link', { name: formatDateLongZoned(dispatchedStub.SubmitTime) });
    expect(listed.getAttribute('href')).toBe('/jobs/export%2Fdispatch-1790611797-8a1b2c3d?namespace=default');
  });

  test('dispatches the job and links to the dispatched job', async () => {
    const calls = mockFetch(nomad({
      ...exportRoutes,
      '/api/nomad/v1/job/export/dispatch': dispatchReply,
    }));
    renderPage('/jobs/export?namespace=default');

    await dispatchWithDatabase('orders');

    const link = await screen.findByRole('link', { name: 'Open Job' });
    expect(link.getAttribute('href')).toBe('/jobs/export%2Fdispatch-1790611797-8a1b2c3d?namespace=default');
    expect(calls.filter((c) => c.method === 'POST')).toEqual([
      { method: 'POST', url: '/api/nomad/v1/job/export/dispatch?namespace=default', body: { Meta: { database: 'orders' } } },
    ]);
  });

  // Nomad rejects a dispatch of a stopped job
  test('a stopped job cannot be dispatched', async () => {
    mockFetch(nomad({ ...exportRoutes, ...jobRoutes({ ...exportJob, Stop: true, Status: 'dead' }) }));
    renderPage('/jobs/export?namespace=default');

    const button = (await screen.findByRole('button', { name: 'Dispatch' })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.title).toBe('Start the job to dispatch it');
  });

  test('a dispatched job cannot be dispatched again', async () => {
    mockFetch(nomad(jobRoutes(dispatchedJob)));
    renderPage(`/jobs/${encodeURIComponent(dispatchedJob.ID)}?namespace=default`);

    expect(await screen.findByText(`Job ID: ${dispatchedJob.ID}`)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Dispatch' })).toBeNull();
  });

  test('a dispatched job links back to its parameterized job', async () => {
    mockFetch(nomad(jobRoutes(dispatchedJob)));
    renderPage(`/jobs/${encodeURIComponent(dispatchedJob.ID)}?namespace=default`);

    const parentLink = await screen.findByRole('link', { name: 'export' });
    expect(parentLink.getAttribute('href')).toBe('/jobs/export?namespace=default');
    expect(parentLink.parentElement!.textContent).toBe('Dispatched from export');
    expect(screen.queryByText(/Launch of/)).toBeNull();
  });
});

describe('JobDetailPage deployment', () => {
  const deployment = {
    ID: 'dep-12345678',
    JobID: 'web',
    JobVersion: 2,
    Status: 'running',
    StatusDescription: 'Deployment running',
    TaskGroups: {
      api: {
        AutoPromote: false,
        AutoRevert: false,
        Canaries: ['alloc-1'],
        DesiredCanaries: 1,
        DesiredTotal: 3,
        HealthyAllocs: 1,
        PlacedAllocs: 3,
        Promoted: false,
        UnhealthyAllocs: 0,
      },
    },
  };

  test('renders deployment card and promotes canaries', async () => {
    let promoted = false;
    mockFetch((call) => {
      if (call.url.startsWith('/api/auth/validate')) return { body: { authenticated: true } };
      if (call.url.startsWith('/api/nomad/v1/job/web/deployment')) return { body: deployment };
      if (call.url.startsWith('/api/nomad/v1/job/web?')) return { body: service };
      if (call.url.startsWith('/api/nomad/v1/job/web/allocations')) return { body: [] };
      if (call.url.startsWith('/api/nomad/v1/job/web/versions')) return { body: { Versions: [] } };
      if (call.url.startsWith('/api/nomad/v1/deployment/promote/dep-12345678')) {
        promoted = true;
        return { body: {} };
      }
      return undefined;
    });

    renderPage('/jobs/web?namespace=default');

    expect(await screen.findByText('dep-1234')).toBeTruthy();
    expect(screen.getByText('Deployment')).toBeTruthy();
    const promoteBtn = screen.getByRole('button', { name: /Promote Canaries/i });
    expect(promoteBtn).toBeTruthy();

    fireEvent.click(promoteBtn);
    const promoteButtons = await screen.findAllByRole('button', { name: /Promote Canaries/i });
    // The confirmation dialog's confirm button is the last one rendered
    fireEvent.click(promoteButtons[promoteButtons.length - 1]);

    await waitFor(() => {
      expect(promoted).toBe(true);
    });
  });
});

describe('JobDetailPage task group scaling', () => {
  const serviceWithGroup = {
    ...service,
    TaskGroups: [
      {
        Name: 'web-group',
        Count: 3,
        Tasks: [{ Name: 'server', Driver: 'docker' }],
      },
    ],
  };

  test('opens scale dialog and scales task group', async () => {
    let scaledCount = 0;
    mockFetch((call) => {
      if (call.url.startsWith('/api/auth/validate')) return { body: { authenticated: true } };
      if (call.url.startsWith('/api/nomad/v1/job/web/deployment')) return { body: null };
      if (call.url.startsWith('/api/nomad/v1/job/web?')) return { body: serviceWithGroup };
      if (call.url.startsWith('/api/nomad/v1/job/web/allocations')) return { body: [] };
      if (call.url.startsWith('/api/nomad/v1/job/web/versions')) return { body: { Versions: [] } };
      if (call.url.startsWith('/api/nomad/v1/job/web/scale')) {
        scaledCount = (call.body as { Count: number }).Count;
        return { body: { EvalID: 'eval-scaled', JobModifyIndex: 10 } };
      }
      return undefined;
    });

    renderPage('/jobs/web?namespace=default');

    expect(await screen.findByText('Task Group: web-group')).toBeTruthy();
    const scaleBtn = screen.getByRole('button', { name: 'Scale' });
    expect(scaleBtn).toBeTruthy();

    // Click Scale to open modal
    fireEvent.click(scaleBtn);
    expect(await screen.findByText('Scale Task Group: web-group')).toBeTruthy();
    expect(screen.getByText('3 allocations')).toBeTruthy();

    // Increment count using Increase count button (+1 -> 4)
    fireEvent.click(screen.getByRole('button', { name: 'Increase count' }));
    const submitBtn = screen.getByRole('button', { name: 'Scale to 4' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(scaledCount).toBe(4);
    });
  });
});

describe('JobDetailPage allocations', () => {
  const allocation = {
    ID: 'aaaa1111-2222-3333', Name: 'web.api[0]', JobID: 'web', JobType: 'service', Namespace: 'default',
    TaskGroup: 'api', NodeName: 'node-alpha', ClientStatus: 'running', DesiredStatus: 'run',
    CreateTime: 1790611000000000000, TaskStates: { server: { State: 'running', Failed: false, Restarts: 0 } },
  };
  const allocationsPath = '/api/nomad/v1/job/web/allocations';
  const webRoutes = { ...jobRoutes(service), [allocationsPath]: [allocation] };

  function allocationLoads(calls: FetchCall[]) {
    return calls.filter((c) => c.url.startsWith(allocationsPath)).length;
  }

  test('lists the allocations of the job with their actions', async () => {
    mockFetch(nomad(webRoutes));
    renderPage('/jobs/web?namespace=default');

    fireEvent.click(await screen.findByRole('button', { name: 'Allocations' }));

    expect(await screen.findByText('Allocations (1)')).toBeTruthy();
    // Table row and mobile card
    expect(screen.getAllByText('aaaa1111')).toHaveLength(2);
    expect(screen.getAllByText('node-alpha')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /allocation actions/i })).toHaveLength(2);
  });

  test('stopping an allocation reloads the allocations and stays on the tab', async () => {
    const calls = mockFetch(nomad(webRoutes));
    renderPage('/jobs/web?namespace=default&tab=allocations');

    const heading = await screen.findByText('Allocations (1)');
    const loadsBefore = allocationLoads(calls);
    fireEvent.click(screen.getAllByRole('button', { name: /allocation actions/i })[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Stop Allocation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop Allocation' }));

    await waitFor(() => expect(allocationLoads(calls)).toBe(loadsBefore + 1));
    expect(calls.filter((c) => c.method === 'POST').map((c) => c.url)).toEqual([
      '/api/nomad/v1/allocation/aaaa1111-2222-3333/stop?namespace=default',
    ]);
    expect(heading.isConnected).toBe(true);
  });

  // Nomad needs a moment to place a replacement: the list right after an action can still be the old one
  test('refresh reloads the allocations', async () => {
    const calls = mockFetch(nomad(webRoutes));
    renderPage('/jobs/web?namespace=default&tab=allocations');

    await screen.findByText('Allocations (1)');
    const loadsBefore = allocationLoads(calls);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(allocationLoads(calls)).toBe(loadsBefore + 1));
  });

  test('a job without allocations says so', async () => {
    mockFetch(nomad(jobRoutes(service)));
    renderPage('/jobs/web?namespace=default&tab=allocations');

    expect(await screen.findByText('Allocations (0)')).toBeTruthy();
    expect(screen.getByText('This job has no allocations.')).toBeTruthy();
  });

  // A periodic job has no allocations of its own
  test('a periodic job has no Allocations tab', async () => {
    mockFetch(nomad(parentRoutes));
    renderPage('/jobs/backup?namespace=default');

    expect(await screen.findByText('Schedule')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Allocations' })).toBeNull();
    await waitForNextAndLastLaunch();
  });
});
