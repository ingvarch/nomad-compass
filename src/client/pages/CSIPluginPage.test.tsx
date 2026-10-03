import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CSIPluginPage from './CSIPluginPage';
import { mockFetch } from '../../test/mockFetch';
import { getPermissionErrorMessage } from '../lib/errors';
import { pluginDetail } from '../../test/csi';

afterEach(() => {
  cleanup();
});

const nodeId = '2a0bce4e-7c1d-4f0e-9d7a-3b5f1c9e8a21';

function renderPage(plugin: unknown = pluginDetail, fail?: { status: number; message: string }) {
  const calls = mockFetch(() => (fail ? { status: fail.status, body: { message: fail.message } } : { body: plugin }));
  render(
    <MemoryRouter initialEntries={['/storage/plugins/hostpath-plugin0']}>
      <Routes>
        <Route path="/storage/plugins/:pluginId" element={<CSIPluginPage />} />
      </Routes>
    </MemoryRouter>
  );
  return calls;
}

describe('CSIPluginPage', () => {
  test('shows the provider and the health of the controllers and nodes', async () => {
    const calls = renderPage();

    expect(await screen.findByRole('heading', { name: 'hostpath-plugin0' })).toBeTruthy();
    expect(calls[0].url).toBe('/api/nomad/v1/plugin/csi/hostpath-plugin0');
    expect(screen.getByText('csi-hostpath v1.9.0')).toBeTruthy();
    expect(screen.getAllByText('1 / 1')).toHaveLength(2);
    // The instances have health badges of their own
    const instances = screen.getByRole('region', { name: 'Instances' });
    expect(screen.getAllByText('healthy').filter((badge) => !instances.contains(badge))).toHaveLength(1);
  });

  test('lists what the controller supports', async () => {
    renderPage();

    const features = within(await screen.findByRole('region', { name: 'Controller Features' }));
    expect(features.getByText('Create and delete volumes')).toBeTruthy();
    expect(features.getByText('Snapshots')).toBeTruthy();
    expect(features.queryByText('Attach and detach')).toBeNull();
  });

  test('lists the running controller and node plugins with a link to their node', async () => {
    renderPage();

    const instances = within(await screen.findByRole('region', { name: 'Instances' }));
    const rows = instances.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(['controller', 'node']);
    expect(within(rows[0]).getByRole('link', { name: nodeId.slice(0, 8) }).getAttribute('href')).toBe(`/nodes/${nodeId}`);
    expect(rows[0].textContent).toContain('f3dc8719');
  });

  test('says when the plugin needs no controller', async () => {
    renderPage({ ...pluginDetail, ControllerRequired: false, Controllers: null });

    expect(await screen.findByText('Not required')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Controller Features' })).toBeNull();
  });

  test('explains a permission error', async () => {
    renderPage(undefined, { status: 403, message: 'Permission denied' });

    expect(await screen.findByText(getPermissionErrorMessage('read-plugins'))).toBeTruthy();
  });
});
