import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { mockFetch, type FetchCall } from '../../test/mockFetch';
import { formatIsoDateLong } from '../lib/utils/dateFormatter';
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
const service = {
  ID: 'web', Name: 'web', Namespace: 'default', Type: 'service', Status: 'running', Stop: false,
  SubmitTime: 1790611000000000000, Version: 0, JobModifyIndex: 5, ParentID: '', TaskGroups: [],
};
const parentRoutes = {
  '/api/nomad/v1/job/backup/allocations': [],
  '/api/nomad/v1/job/backup/versions': { Versions: [] },
  '/api/nomad/v1/job/backup/plan': { NextPeriodicLaunch: '2026-09-28T18:15:00+02:00' },
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

// GET requests of the job itself, not of its allocations or versions
function jobGets(calls: FetchCall[], id: string) {
  return calls.filter((c) => c.method === 'GET' && c.url.startsWith(`/api/nomad/v1/job/${id}?`)).length;
}

function wait(ms: number) {
  return act(() => new Promise((resolve) => setTimeout(resolve, ms)));
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
    expect(await screen.findByText(formatIsoDateLong('2026-09-28T18:15:00+02:00'))).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Run now' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Logs' })).toBeNull();

    // Loading the page changes nothing: the only POST is the plan dry-run
    const posts = calls.filter((c) => c.method === 'POST').map((c) => c.url);
    expect(posts).toEqual(['/api/nomad/v1/job/backup/plan?namespace=default']);

    fireEvent.click(screen.getByRole('button', { name: 'Launches' }));
    expect(await screen.findByText('Launches (1)')).toBeTruthy();
  });

  test('opens the overview for a tab the periodic job does not have', async () => {
    mockFetch(nomad(parentRoutes));
    renderPage('/jobs/backup?namespace=default&tab=logs');

    expect(await screen.findByText('Schedule')).toBeTruthy();
  });

  test('a task group of a periodic job has no View Logs button', async () => {
    mockFetch(nomad(parentRoutes));
    renderPage('/jobs/backup?namespace=default');

    fireEvent.click(await screen.findByText('Task Group: db'));
    expect(screen.getByText('dump')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View Logs' })).toBeNull();
  });

  test('a launch links to its periodic job and cannot be edited or cloned', async () => {
    mockFetch(nomad({
      '/api/nomad/v1/job/backup%2Fperiodic-1790611797/allocations': [],
      '/api/nomad/v1/job/backup%2Fperiodic-1790611797/versions': { Versions: [] },
      '/api/nomad/v1/job/backup%2Fperiodic-1790611797?': launchJob,
    }));
    renderPage('/jobs/backup%2Fperiodic-1790611797?namespace=default');

    const parentLink = await screen.findByRole('link', { name: 'backup' });
    expect(parentLink.getAttribute('href')).toBe('/jobs/backup?namespace=default');
    expect(screen.queryByRole('link', { name: /Edit/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Clone/ })).toBeNull();
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
    mockFetch(nomad({
      '/api/nomad/v1/job/web/allocations': [],
      '/api/nomad/v1/job/web/versions': { Versions: [] },
      '/api/nomad/v1/job/web?': service,
    }));
    renderPage('/jobs/web?namespace=default&tab=launches');

    expect(await screen.findByText('Job Summary')).toBeTruthy();
    expect(screen.queryByText(/^Launches \(/)).toBeNull();
  });
});
