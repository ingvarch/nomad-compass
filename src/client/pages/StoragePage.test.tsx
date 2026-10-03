import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StoragePage from './StoragePage';
import { mockFetch, type FetchCall } from '../../test/mockFetch';
import { ToastProvider } from '../context/ToastContext';
import { getPermissionErrorMessage } from '../lib/errors';
import { claimedVolume, pluginStub, unclaimedVolume } from '../../test/csi';

afterEach(() => {
  cleanup();
});

function nomad(volumes: unknown[] = [claimedVolume, unclaimedVolume], fail?: { status: number; message: string }) {
  return mockFetch(({ url }: FetchCall) => {
    if (fail) return { status: fail.status, body: { message: fail.message } };
    if (url.startsWith('/api/nomad/v1/volumes')) return { body: volumes };
    if (url.startsWith('/api/nomad/v1/plugins')) return { body: [pluginStub] };
    if (url.startsWith('/api/nomad/v1/namespaces')) return { body: [{ Name: 'default' }, { Name: 'prod' }] };
    return undefined;
  });
}

function renderPage(path = '/storage') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <StoragePage />
      </ToastProvider>
    </MemoryRouter>
  );
}

// The desktop table; the mobile cards repeat the same values
function table() {
  return within(screen.getByRole('table'));
}

describe('StoragePage volumes', () => {
  test('lists the volumes of all namespaces with their plugin, claims and health', async () => {
    const calls = nomad();
    renderPage();

    const link = await screen.findAllByRole('link', { name: 'test-volume[0]' });
    expect(link[0].getAttribute('href')).toBe('/storage/volumes/test-volume%5B0%5D?namespace=default');
    expect(calls[0].url).toBe('/api/nomad/v1/volumes?type=csi&namespace=*');

    const rows = table().getAllByRole('row');
    expect(rows[1].textContent).toContain('default');
    expect(rows[1].textContent).toContain('single-node-reader-only');
    expect(rows[1].textContent).toContain('1 reader, 0 writers');
    expect(rows[1].textContent).toContain('healthy');
    expect(within(rows[1]).getByRole('link', { name: 'hostpath-plugin0' }).getAttribute('href')).toBe(
      '/storage/plugins/hostpath-plugin0'
    );
  });

  // Nomad sets the mode of a volume from its claims
  test('shows an unclaimed volume without a mode and an unschedulable one as such', async () => {
    nomad();
    renderPage();

    await screen.findAllByRole('link', { name: 'postgres-data' });
    const row = table().getAllByRole('row')[2];
    expect(row.textContent).toContain('prod');
    expect(row.textContent).toContain('Not claimed');
    expect(row.textContent).toContain('unschedulable');
  });

  test('explains an empty list', async () => {
    nomad([]);
    renderPage();

    expect(await screen.findByText(/No CSI volumes/)).toBeTruthy();
  });

  test('explains a permission error', async () => {
    nomad([], { status: 403, message: 'Permission denied' });
    renderPage();

    expect(await screen.findByText(getPermissionErrorMessage('list-volumes'))).toBeTruthy();
    expect(getPermissionErrorMessage('list-volumes')).toContain('csi-list-volume');
  });
});

describe('StoragePage registration', () => {
  test('registers a volume and lists it', async () => {
    let registered = false;
    const calls = mockFetch(({ url, method }: FetchCall) => {
      if (method === 'PUT') {
        registered = true;
        return { body: {} };
      }
      if (url.startsWith('/api/nomad/v1/volumes')) return { body: registered ? [claimedVolume, unclaimedVolume] : [claimedVolume] };
      if (url.startsWith('/api/nomad/v1/plugins')) return { body: [pluginStub] };
      if (url.startsWith('/api/nomad/v1/namespaces')) return { body: [{ Name: 'default' }, { Name: 'prod' }] };
      return undefined;
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Register Volume' }));
    fireEvent.change(screen.getByLabelText('Volume ID'), { target: { value: 'postgres-data' } });
    fireEvent.change(screen.getByLabelText('External ID'), { target: { value: 'vol-0abc123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect((await screen.findAllByRole('link', { name: 'postgres-data' })).length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Register Volume' })).toBeNull();
    expect(calls.filter((c) => c.method === 'PUT').map((c) => c.url)).toEqual([
      '/api/nomad/v1/volume/csi/postgres-data?namespace=default',
    ]);
  });
});

describe('StoragePage plugins', () => {
  test('lists the plugins with the health of their controllers and nodes', async () => {
    const calls = nomad();
    renderPage('/storage?tab=plugins');

    const link = await screen.findAllByRole('link', { name: 'hostpath-plugin0' });
    expect(link[0].getAttribute('href')).toBe('/storage/plugins/hostpath-plugin0');
    const row = table().getAllByRole('row')[1];
    expect(row.textContent).toContain('csi-hostpath');
    expect(row.textContent).toContain('1 / 1');
    expect(row.textContent).toContain('1 / 2');
    expect(row.textContent).toContain('degraded');
    expect(calls.some((c) => c.url === '/api/nomad/v1/plugins?type=csi')).toBe(true);
  });

  test('switches between the tabs', async () => {
    nomad();
    renderPage();

    await screen.findAllByRole('link', { name: 'test-volume[0]' });
    fireEvent.click(screen.getByRole('tab', { name: 'Plugins' }));

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Plugins' }).getAttribute('aria-selected')).toBe('true'));
    expect(await screen.findAllByRole('link', { name: 'hostpath-plugin0' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'test-volume[0]' })).toBeNull();
  });
});
