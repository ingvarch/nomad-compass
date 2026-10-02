import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VariablesPage from './VariablesPage';
import { ToastProvider } from '../context/ToastContext';
import { mockFetch, type FetchCall } from '../../test/mockFetch';

const mockVariables = [
  {
    Path: 'nomad/jobs/api',
    Namespace: 'default',
    CreateIndex: 1,
    ModifyIndex: 5,
    CreateTime: 1690000000000000,
    ModifyTime: 1695000000000000,
  },
  {
    Path: 'database/credentials',
    Namespace: 'prod',
    CreateIndex: 2,
    ModifyIndex: 3,
    CreateTime: 1691000000000000,
    ModifyTime: 1696000000000000,
  },
];

const mockNamespaces = [
  { Name: 'default', Description: 'Default' },
  { Name: 'prod', Description: 'Production' },
];

function handleNomadFetch({ url, method = 'GET' }: FetchCall) {
  if (url.startsWith('/api/nomad/v1/namespaces')) return { body: mockNamespaces };
  if (url.startsWith('/api/nomad/v1/vars')) return { body: mockVariables };
  if (url.startsWith('/api/nomad/v1/var/')) {
    if (method === 'DELETE' || method === 'PUT') return { body: {} };
    return {
      body: {
        Path: 'nomad/jobs/api',
        Namespace: 'default',
        Items: { KEY_1: 'val_1' },
        CreateIndex: 1,
        ModifyIndex: 1,
        CreateTime: 1000,
        ModifyTime: 2000,
      },
    };
  }
  return undefined;
}

describe('VariablesPage', () => {
  test('renders page header and variables list', async () => {
    mockFetch(handleNomadFetch);

    render(
      <MemoryRouter>
        <ToastProvider>
          <VariablesPage />
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Variables & Secrets')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create Variable/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getAllByText('nomad/jobs/api').length).toBeGreaterThan(0);
      expect(screen.getAllByText('database/credentials').length).toBeGreaterThan(0);
    });
  });

  test('filters variables by search query', async () => {
    mockFetch(handleNomadFetch);

    render(
      <MemoryRouter>
        <ToastProvider>
          <VariablesPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('nomad/jobs/api').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/Search variables by path/i);
    fireEvent.change(searchInput, { target: { value: 'database' } });

    expect(screen.getAllByText('database/credentials').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('nomad/jobs/api')).toHaveLength(0);
  });

  test('opens create variable modal when button clicked', async () => {
    mockFetch(handleNomadFetch);

    render(
      <MemoryRouter>
        <ToastProvider>
          <VariablesPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('nomad/jobs/api').length).toBeGreaterThan(0);
    });

    const createBtn = screen.getByRole('button', { name: /Create Variable/i });
    fireEvent.click(createBtn);

    expect(screen.getByRole('heading', { name: 'Create Variable' })).toBeTruthy();
  });

  test('opens view detail modal on variable click', async () => {
    mockFetch(handleNomadFetch);

    render(
      <MemoryRouter>
        <ToastProvider>
          <VariablesPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('nomad/jobs/api').length).toBeGreaterThan(0);
    });

    const varLinks = screen.getAllByRole('button', { name: /nomad\/jobs\/api/i });
    await act(async () => {
      fireEvent.click(varLinks[0]);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Variable: nomad/jobs/api' })).toBeTruthy();
      expect(screen.getByText('KEY_1')).toBeTruthy();
    });
  });

  test('opens delete dialog and confirms deletion', async () => {
    const calls = mockFetch(handleNomadFetch);

    render(
      <MemoryRouter>
        <ToastProvider>
          <VariablesPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('nomad/jobs/api').length).toBeGreaterThan(0);
    });

    const deleteBtns = screen.getAllByTitle('Delete variable');
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByRole('heading', { name: 'Delete Variable' })).toBeTruthy();

    await act(async () => {
      const confirmBtn = screen.getByRole('button', { name: 'Delete Variable' });
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      const deleteCall = calls.find((c) => c.method === 'DELETE');
      expect(deleteCall).toBeDefined();
      expect(deleteCall?.url).toContain('/api/nomad/v1/var/nomad/jobs/api');
    });
  });
});
