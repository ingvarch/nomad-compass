import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DataTable from '../ui/DataTable';
import JobList, { jobColumns } from './JobList';
import { AuthProvider } from '../../context/AuthContext';
import { mockFetch } from '../../../test/mockFetch';
import type { NomadJobListStub } from '../../types/nomad';

const job: NomadJobListStub = {
  ID: 'backup', ParentID: '', Name: 'backup', Namespace: 'default', Type: 'batch', Status: 'running',
  Stop: false, Periodic: false, ParameterizedJob: false, SubmitTime: 0,
};

function renderRow(row: NomadJobListStub) {
  render(
    <MemoryRouter>
      <DataTable items={[row]} columns={jobColumns} keyExtractor={(item) => item.ID} />
    </MemoryRouter>
  );
}

function renderList(jobs: NomadJobListStub[]) {
  mockFetch(({ url }) => {
    if (url === '/api/auth/validate') return { body: { authenticated: true } };
    if (url === '/api/nomad/v1/namespaces') return { body: [{ Name: 'default' }] };
    if (url.startsWith('/api/nomad/v1/jobs?')) return { body: jobs };
  });

  render(
    <MemoryRouter>
      <AuthProvider>
        <JobList />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('jobColumns', () => {
  test('marks periodic jobs', () => {
    renderRow({ ...job, Periodic: true });
    expect(screen.getByText('periodic')).toBeTruthy();
  });

  test('marks parameterized jobs', () => {
    renderRow({ ...job, ParameterizedJob: true });
    expect(screen.getByText('parameterized')).toBeTruthy();
  });

  test('regular jobs have no kind badge', () => {
    renderRow(job);
    expect(screen.queryByText('periodic')).toBeNull();
    expect(screen.queryByText('parameterized')).toBeNull();
  });
});

describe('JobList', () => {
  test('hides periodic launches', async () => {
    const launch = { ...job, ID: 'backup/periodic-1790611797', Name: 'backup/periodic-1790611797', ParentID: 'backup' };
    renderList([{ ...job, Periodic: true }, launch]);

    expect(await screen.findByRole('link', { name: 'backup' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'backup/periodic-1790611797' })).toBeNull();
  });

  test('hides dispatched jobs and marks their parameterized job in the table and the cards', async () => {
    const sync = { ...job, ID: 'sync', Name: 'sync', ParameterizedJob: true };
    const dispatch = { ...job, ID: 'sync/dispatch-1730972650-247c6e97', Name: 'sync/dispatch-1730972650-247c6e97', ParentID: 'sync' };
    renderList([sync, dispatch]);

    expect(await screen.findByRole('link', { name: 'sync' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /dispatch-/ })).toBeNull();
    expect(screen.getAllByText('parameterized')).toHaveLength(2);
  });
});
