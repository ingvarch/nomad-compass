import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { mockFetch } from '../../../test/mockFetch';
import JobForm from './JobForm';

const pausedJob = {
  ID: 'backup', Name: 'backup', Namespace: 'default', Type: 'batch', Status: 'dead', Stop: false,
  Datacenters: ['dc1'], SubmitTime: 0, Version: 1, JobModifyIndex: 11, ParentID: '',
  TaskGroups: [{ Name: 'db', Count: 1, Tasks: [{ Name: 'dump', Driver: 'docker', Config: { image: 'postgres:16' } }] }],
  Periodic: { Enabled: false, Specs: ['0 3 * * *'], SpecType: 'cron', ProhibitOverlap: true, TimeZone: 'UTC' },
};

describe('JobForm', () => {
  test('the plan of a paused periodic job says allocations come with each launch', async () => {
    mockFetch(({ url, method }) => {
      if (url.startsWith('/api/auth/validate')) return { body: { authenticated: true } };
      if (method === 'GET' && url.startsWith('/api/nomad/v1/job/backup?')) return { body: pausedJob };
      // A paused schedule has no next launch
      if (url.startsWith('/api/nomad/v1/job/backup/plan')) {
        return { body: { Index: 1, NextPeriodicLaunch: null, Annotations: { DesiredTGUpdates: { db: { Place: 1 } } } } };
      }
      return undefined;
    });
    render(
      <MemoryRouter>
        <ToastProvider>
          <AuthProvider>
            <JobForm mode="edit" jobId="backup" namespace="default" />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Plan' }));

    expect(await screen.findByText('Nomad creates allocations at each launch.')).toBeTruthy();
  });
});
