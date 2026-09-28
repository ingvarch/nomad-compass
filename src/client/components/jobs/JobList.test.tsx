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
  Stop: false, Periodic: false, SubmitTime: 0,
};

function renderRow(row: NomadJobListStub) {
  render(
    <MemoryRouter>
      <DataTable items={[row]} columns={jobColumns} keyExtractor={(item) => item.ID} />
    </MemoryRouter>
  );
}

describe('jobColumns', () => {
  test('marks periodic jobs', () => {
    renderRow({ ...job, Periodic: true });
    expect(screen.getByText('periodic')).toBeTruthy();
  });

  test('regular jobs have no periodic badge', () => {
    renderRow(job);
    expect(screen.queryByText('periodic')).toBeNull();
  });
});

describe('JobList', () => {
  test('hides periodic launches', async () => {
    const launch = { ...job, ID: 'backup/periodic-1790611797', Name: 'backup/periodic-1790611797', ParentID: 'backup' };
    mockFetch(({ url }) => {
      if (url === '/api/auth/validate') return { body: { authenticated: true } };
      if (url === '/api/nomad/v1/namespaces') return { body: [{ Name: 'default' }] };
      if (url.startsWith('/api/nomad/v1/jobs?')) return { body: [{ ...job, Periodic: true }, launch] };
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <JobList />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('link', { name: 'backup' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'backup/periodic-1790611797' })).toBeNull();
  });
});
