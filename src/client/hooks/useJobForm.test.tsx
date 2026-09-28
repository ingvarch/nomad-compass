import { describe, test, expect } from 'bun:test';
import type { ChangeEvent, ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider, useToast } from '../context/ToastContext';
import { JobFormProvider } from '../context/JobFormContext';
import { mockFetch } from '../../test/mockFetch';
import { useJobForm } from './useJobForm';

const job = {
  ID: 'web', Name: 'web', Namespace: 'default', Type: 'service', Status: 'running', Stop: false,
  Datacenters: ['dc1'], SubmitTime: 0, Version: 0, JobModifyIndex: 5, ParentID: '',
  TaskGroups: [{ Name: 'app', Count: 1, Tasks: [{ Name: 'nginx', Driver: 'docker', Config: { image: 'nginx' } }] }],
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <JobFormProvider initialLoading>{children}</JobFormProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('useJobForm in edit mode', () => {
  test('a toast keeps the loaded job and the user edits', async () => {
    const calls = mockFetch(({ url }) => {
      if (url.startsWith('/api/auth/validate')) return { body: { authenticated: true } };
      if (url.startsWith('/api/nomad/v1/job/web?')) return { body: job };
      return undefined;
    });
    const { result } = renderHook(
      () => ({ form: useJobForm({ mode: 'edit', jobId: 'web' }), toast: useToast() }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.form.formData?.datacenters).toEqual(['dc1']));

    act(() => result.current.form.handleInputChange(
      { target: { name: 'datacenters', value: 'dc2', type: 'text' } } as ChangeEvent<HTMLInputElement>
    ));
    act(() => result.current.toast.addToast('Plan failed', 'error', Infinity));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(result.current.form.formData?.datacenters).toEqual(['dc2']);
    expect(calls.filter((c) => c.url.startsWith('/api/nomad/v1/job/web?'))).toHaveLength(1);
  });
});
