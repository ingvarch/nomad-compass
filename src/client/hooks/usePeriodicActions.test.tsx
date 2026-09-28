import { describe, test, expect, mock } from 'bun:test';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act, screen } from '@testing-library/react';
import { ToastProvider } from '../context/ToastContext';
import { ToastContainer } from '../components/ui/Toast';
import { mockFetch } from '../../test/mockFetch';
import { getPermissionErrorMessage } from '../lib/errors';
import { usePeriodicActions } from './usePeriodicActions';
import type { NomadJob } from '../types/nomad';

const job = {
  ID: 'backup', Name: 'backup', Namespace: 'default', Type: 'batch', Status: 'running', Stop: false,
  SubmitTime: 0, Version: 2, JobModifyIndex: 11, ParentID: '',
  Periodic: { Enabled: true, Specs: ['*/5 * * * *'], SpecType: 'cron', ProhibitOverlap: true, TimeZone: 'UTC' },
} as NomadJob;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
    </ToastProvider>
  );
}

function renderActions(target: NomadJob = job) {
  const handlers = { onLaunched: mock(() => {}), onScheduleChanged: mock(() => {}) };
  const { result } = renderHook(() => usePeriodicActions(target, handlers), { wrapper });
  return { result, handlers };
}

describe('usePeriodicActions', () => {
  test('reads the next launch from a plan', async () => {
    const calls = mockFetch(({ url }) =>
      url.includes('/plan') ? { body: { NextPeriodicLaunch: '2026-09-28T18:15:00+02:00' } } : undefined
    );
    const { result } = renderActions();

    await waitFor(() => expect(result.current.nextLaunch).toBe('2026-09-28T18:15:00+02:00'));
    expect(calls[0].url).toBe('/api/nomad/v1/job/backup/plan?namespace=default');
  });

  test('ignores the zero time Nomad 1.x sends', async () => {
    const calls = mockFetch(() => ({ body: { NextPeriodicLaunch: '0001-01-01T00:00:00Z' } }));
    const { result } = renderActions();

    await waitFor(() => expect(calls).toHaveLength(1));
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(result.current.nextLaunch).toBeNull();
  });

  test('does not plan a paused job', async () => {
    const calls = mockFetch();
    const { result } = renderActions({ ...job, Periodic: { ...job.Periodic!, Enabled: false } });

    await waitFor(() => expect(result.current.nextLaunch).toBeNull());
    expect(calls).toHaveLength(0);
  });

  test('does not plan a stopped job', async () => {
    const calls = mockFetch();
    const { result } = renderActions({ ...job, Stop: true });

    await waitFor(() => expect(result.current.nextLaunch).toBeNull());
    expect(calls).toHaveLength(0);
  });

  test('reports a plan error as the next launch error', async () => {
    mockFetch(() => ({ status: 403, body: { message: 'Permission denied' } }));
    const { result } = renderActions();

    await waitFor(() => expect(result.current.nextLaunchError).toBe('Permission denied'));
  });

  test('run now forces a launch', async () => {
    const calls = mockFetch(({ url }) =>
      url.includes('/periodic/force') ? { body: { EvalID: '198c9740-1446-82a5', EvalCreateIndex: 12 } } : undefined
    );
    const { result, handlers } = renderActions();

    await act(async () => {
      await result.current.runNow();
    });

    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/nomad/v1/job/backup/periodic/force?namespace=default')).toBe(true);
    expect(handlers.onLaunched).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Launch started, evaluation 198c9740')).toBeTruthy();
  });

  test('run now without permission shows the permission message', async () => {
    mockFetch(({ url }) => (url.includes('/periodic/force') ? { status: 403, body: { message: 'Permission denied' } } : undefined));
    const { result } = renderActions();

    await act(async () => {
      await result.current.runNow();
    });

    expect(result.current.permissionError).toBe(getPermissionErrorMessage('run-periodic-job'));
  });

  test('run now shows the Nomad error', async () => {
    mockFetch(({ url }) =>
      url.includes('/periodic/force') ? { status: 500, body: { message: "can't force run non-tracked job" } } : undefined
    );
    const { result, handlers } = renderActions();

    await act(async () => {
      await result.current.runNow();
    });

    expect(await screen.findByText("can't force run non-tracked job")).toBeTruthy();
    expect(handlers.onLaunched).not.toHaveBeenCalled();
  });

  test('pause registers the current job with the schedule off and the read index', async () => {
    const calls = mockFetch(({ url, method }) => {
      if (method === 'GET' && url.startsWith('/api/nomad/v1/job/backup?')) return { body: { ...job, JobModifyIndex: 15 } };
      if (method === 'POST' && url === '/api/nomad/v1/jobs') return { body: { EvalID: '', JobModifyIndex: 16 } };
      return undefined;
    });
    const { result, handlers } = renderActions();

    await act(async () => {
      await result.current.togglePause();
    });

    const register = calls.find((c) => c.method === 'POST' && c.url === '/api/nomad/v1/jobs');
    expect(register?.body).toMatchObject({ EnforceIndex: true, JobModifyIndex: 15, Job: { Periodic: { Enabled: false } } });
    expect(handlers.onScheduleChanged).toHaveBeenCalledTimes(1);
  });

  test('resume registers the current job with the schedule on', async () => {
    const paused = { ...job, Periodic: { ...job.Periodic!, Enabled: false } };
    const calls = mockFetch(({ url, method }) => {
      if (method === 'GET' && url.startsWith('/api/nomad/v1/job/backup?')) return { body: paused };
      if (method === 'POST' && url === '/api/nomad/v1/jobs') return { body: { EvalID: '', JobModifyIndex: 12 } };
      return undefined;
    });
    const { result, handlers } = renderActions(paused);

    await act(async () => {
      await result.current.togglePause();
    });

    const register = calls.find((c) => c.method === 'POST' && c.url === '/api/nomad/v1/jobs');
    expect(register?.body).toMatchObject({ EnforceIndex: true, JobModifyIndex: 11, Job: { Periodic: { Enabled: true } } });
    expect(handlers.onScheduleChanged).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Schedule resumed')).toBeTruthy();
  });

  test('pause without permission names the capability', async () => {
    mockFetch(({ url, method }) => {
      if (method === 'GET' && url.startsWith('/api/nomad/v1/job/backup?')) return { body: job };
      if (method === 'POST' && url === '/api/nomad/v1/jobs') return { status: 403, body: { message: 'Permission denied' } };
      return undefined;
    });
    const { result } = renderActions();

    await act(async () => {
      await result.current.togglePause();
    });

    expect(result.current.permissionError).toBe(getPermissionErrorMessage('pause-periodic-job'));
    expect(result.current.permissionError).toContain('submit-job');
  });

  test('pause after a concurrent change asks to reload', async () => {
    mockFetch(({ url, method }) => {
      if (method === 'GET' && url.startsWith('/api/nomad/v1/job/backup?')) return { body: job };
      if (method === 'POST' && url === '/api/nomad/v1/jobs') {
        return { status: 500, body: { message: 'Enforcing job modify index 11: job exists with conflicting job modify index: 15' } };
      }
      return undefined;
    });
    const { result, handlers } = renderActions();

    await act(async () => {
      await result.current.togglePause();
    });

    expect(await screen.findByText('Job changed, reload the page')).toBeTruthy();
    expect(handlers.onScheduleChanged).not.toHaveBeenCalled();
  });
});
