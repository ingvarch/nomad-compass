import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CSIVolumePage from './CSIVolumePage';
import { mockFetch, type FetchCall } from '../../test/mockFetch';
import { ToastProvider } from '../context/ToastContext';
import { getPermissionErrorMessage } from '../lib/errors';
import { pluginDetail, volumeDetail } from '../../test/csi';

afterEach(() => {
  cleanup();
});

const snapshot = {
  ID: 'snap-7f3a', ExternalSourceVolumeID: volumeDetail.ExternalID, SourceVolumeID: volumeDetail.ID,
  PluginID: 'hostpath-plugin0', Name: 'before-upgrade', SizeBytes: 1000000, CreateTime: 1790985600, IsReady: true,
};

interface Lab {
  plugin?: unknown;
  fail?: { status: number; message: string };
}

function nomad({ plugin = pluginDetail, fail }: Lab = {}) {
  return mockFetch(({ url, method }: FetchCall) => {
    if (fail) return { status: fail.status, body: { message: fail.message } };
    if (url.startsWith('/api/nomad/v1/volumes/snapshot')) return { body: { Snapshots: [snapshot] } };
    if (url.startsWith('/api/nomad/v1/volume/csi/')) return method === 'GET' ? { body: volumeDetail } : { body: {} };
    if (url.startsWith('/api/nomad/v1/plugin/csi/')) return { body: plugin };
    return undefined;
  });
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/storage/volumes/test-volume%5B0%5D?namespace=default']}>
      <ToastProvider>
        <Routes>
          <Route path="/storage/volumes/:volumeId" element={<CSIVolumePage />} />
          <Route path="/storage" element={<p>Storage list</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('CSIVolumePage', () => {
  test('shows the plugin, provider, capacity and health of the volume', async () => {
    const calls = nomad();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'test-volume[0]' })).toBeTruthy();
    expect(calls[0].url).toBe('/api/nomad/v1/volume/csi/test-volume%5B0%5D?namespace=default');
    expect(screen.getByRole('link', { name: 'hostpath-plugin0' }).getAttribute('href')).toBe('/storage/plugins/hostpath-plugin0');
    expect(screen.getByText('csi-hostpath v1.9.0')).toBeTruthy();
    expect(screen.getByText('ab043e6d-bf16-11f1-9c6b-a26241bf9398')).toBeTruthy();
    expect(screen.getByText('976.6 KiB')).toBeTruthy();
    expect(screen.getByText('healthy')).toBeTruthy();
  });

  test('lists the capabilities, mount options and topology', async () => {
    nomad();
    renderPage();

    const capabilities = within(await screen.findByRole('region', { name: 'Capabilities' }));
    expect(capabilities.getByText('single-node-reader-only')).toBeTruthy();
    expect(capabilities.getByText('single-node-writer')).toBeTruthy();
    // Nomad redacts the mount flags
    expect(within(screen.getByRole('region', { name: 'Mount Options' })).getByText('[REDACTED]')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Topology' })).getByText('topology.hostpath.csi/node = node-0')).toBeTruthy();
  });

  test('lists the allocations that use the volume with their claim', async () => {
    nomad();
    renderPage();

    const allocations = within(await screen.findByRole('region', { name: 'Allocations' }));
    expect(allocations.getAllByRole('link', { name: 'example' })[0].getAttribute('href')).toBe('/jobs/example?namespace=default');
    expect(allocations.getAllByText('read').length).toBeGreaterThan(0);
    expect(allocations.getAllByText('worker-1').length).toBeGreaterThan(0);
  });

  test('deregisters the volume after a confirmation and goes back to the list', async () => {
    const calls = nomad();
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Deregister' }));
    fireEvent.click(screen.getByLabelText(/Force/));
    const dialog = screen.getByRole('heading', { name: 'Deregister Volume' }).closest('div')!.parentElement!;
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deregister' }));

    expect(await screen.findByText('Storage list')).toBeTruthy();
    expect(calls.filter((c) => c.method === 'DELETE').map((c) => c.url)).toEqual([
      '/api/nomad/v1/volume/csi/test-volume%5B0%5D?namespace=default&force=true',
    ]);
  });

  test('creates a snapshot when the plugin can', async () => {
    const calls = nomad();
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Snapshot' }));
    fireEvent.change(screen.getByLabelText('Snapshot name'), { target: { value: 'before-upgrade' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Snapshot' }));

    expect(await screen.findByText('snap-7f3a')).toBeTruthy();
    expect(screen.getByText('Ready')).toBeTruthy();
    expect(calls.filter((c) => c.method === 'PUT')).toEqual([
      {
        method: 'PUT',
        url: '/api/nomad/v1/volumes/snapshot?namespace=default',
        body: { Snapshots: [{ SourceVolumeID: 'test-volume[0]', PluginID: 'hostpath-plugin0', Name: 'before-upgrade' }] },
      },
    ]);
  });

  test('offers no snapshot when the plugin cannot snapshot', async () => {
    nomad({ plugin: { ...pluginDetail, Controllers: null } });
    renderPage();

    expect(await screen.findByRole('button', { name: 'Deregister' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Snapshot' })).toBeNull());
  });

  test('explains a permission error', async () => {
    nomad({ fail: { status: 403, message: 'Permission denied' } });
    renderPage();

    expect(await screen.findByText(getPermissionErrorMessage('read-volume'))).toBeTruthy();
  });
});
