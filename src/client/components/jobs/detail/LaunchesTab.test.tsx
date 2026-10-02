import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LaunchesTab } from './LaunchesTab';
import { formatDateLongZoned } from '../../../lib/utils/dateFormatter';
import type { NomadJobListStub } from '../../../types/nomad';

const launch: NomadJobListStub = {
  ID: 'backup/periodic-1790611797', ParentID: 'backup', Name: 'backup/periodic-1790611797', Namespace: 'default',
  Type: 'batch', Status: 'dead', Stop: false, Periodic: false, SubmitTime: 1790611797886474000,
  JobSummary: { JobID: 'backup/periodic-1790611797', Summary: { backup: { Running: 0, Starting: 0, Failed: 0, Complete: 1, Lost: 0, Unknown: 0 } } },
};

function renderTab(props: { launches?: NomadJobListStub[]; loading?: boolean; error?: string | null } = {}) {
  render(
    <MemoryRouter>
      <LaunchesTab
        launches={props.launches ?? [launch]}
        loading={props.loading ?? false}
        error={props.error ?? null}
        onRefresh={() => {}}
      />
    </MemoryRouter>
  );
}

describe('LaunchesTab', () => {
  test('lists launches with a link and allocation counts', () => {
    renderTab();
    expect(screen.getByText('Launches (1)')).toBeTruthy();
    expect(screen.getByText('0 running, 1 complete, 0 failed')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/jobs/backup%2Fperiodic-1790611797?namespace=default');
  });

  test('shows the launch time with its zone', () => {
    renderTab();
    expect(screen.getByRole('link').textContent).toBe(formatDateLongZoned(launch.SubmitTime));
  });

  test('explains an empty list', () => {
    renderTab({ launches: [] });
    expect(screen.getByText(/garbage collection/)).toBeTruthy();
  });

  test('keeps the list while it reloads', () => {
    renderTab({ loading: true });
    expect(screen.getByText('Launches (1)')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('shows a spinner while the first load runs', () => {
    renderTab({ launches: [], loading: true });
    expect(screen.getByRole('status')).toBeTruthy();
  });

  test('shows a load error', () => {
    renderTab({ error: 'Failed to load launches' });
    expect(screen.getByText('Failed to load launches')).toBeTruthy();
  });
});

describe('LaunchesTab for a parameterized job', () => {
  const dispatched: NomadJobListStub = {
    ...launch, ID: 'export/dispatch-1790611797-8a1b2c3d', ParentID: 'export', Name: 'export/dispatch-1790611797-8a1b2c3d',
  };

  function renderDispatches(dispatches: NomadJobListStub[]) {
    render(
      <MemoryRouter>
        <LaunchesTab kind="parameterized" launches={dispatches} loading={false} error={null} onRefresh={() => {}} />
      </MemoryRouter>
    );
  }

  test('lists the dispatched jobs', () => {
    renderDispatches([dispatched]);
    expect(screen.getByText('Dispatches (1)')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Dispatched' })).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/jobs/export%2Fdispatch-1790611797-8a1b2c3d?namespace=default');
  });

  test('explains an empty list', () => {
    renderDispatches([]);
    expect(screen.getByText(/^No dispatches yet\. .*garbage collection/)).toBeTruthy();
  });
});
