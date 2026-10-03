import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { RegisterVolumeModal } from './RegisterVolumeModal';
import { mockFetch } from '../../../test/mockFetch';
import { PermissionError, getPermissionErrorMessage } from '../../lib/errors';
import { pluginStub } from '../../../test/csi';
import type { NomadCSIVolumeRegistration } from '../../types/csi';

afterEach(() => {
  cleanup();
});

function renderModal(register: () => Promise<void> = async () => {}) {
  mockFetch(() => ({ body: [{ Name: 'default' }, { Name: 'prod' }] }));
  const result = { volumes: [] as NomadCSIVolumeRegistration[], closed: 0 };
  render(
    <RegisterVolumeModal
      plugins={[pluginStub, { ...pluginStub, ID: 'aws-ebs', Provider: 'ebs.csi.aws.com' }]}
      onClose={() => { result.closed++; }}
      onRegister={(volume) => {
        result.volumes.push(volume);
        return register();
      }}
    />
  );
  return result;
}

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
}

describe('RegisterVolumeModal', () => {
  test('registers an existing volume with the plugin and the capability of the form', async () => {
    const result = renderModal();

    type('Volume ID', 'postgres-data');
    type('External ID', 'vol-0abc123');
    submit();

    await waitFor(() => expect(result.closed).toBe(1));
    expect(result.volumes).toEqual([
      {
        ID: 'postgres-data',
        Name: 'postgres-data',
        Namespace: 'default',
        PluginID: 'hostpath-plugin0',
        ExternalID: 'vol-0abc123',
        RequestedCapabilities: [{ AccessMode: 'single-node-writer', AttachmentMode: 'file-system' }],
      },
    ]);
  });

  test('offers the namespaces of the cluster', async () => {
    renderModal();

    expect(await screen.findByRole('option', { name: 'prod' })).toBeTruthy();
  });

  test('adds capabilities, mount options and parameters', async () => {
    const result = renderModal();

    type('Volume ID', 'postgres-data');
    type('External ID', 'vol-0abc123');
    fireEvent.change(await screen.findByLabelText('Namespace'), { target: { value: 'prod' } });
    type('Plugin', 'aws-ebs');
    fireEvent.click(screen.getByRole('button', { name: 'Add capability' }));
    type('Access mode 2', 'multi-node-reader-only');
    type('Attachment mode 2', 'block-device');
    type(/^File system/, 'ext4');
    type(/^Mount flags/, 'noatime');
    fireEvent.click(screen.getByRole('button', { name: 'Add parameter' }));
    type('Parameter key 1', 'type');
    type('Parameter value 1', 'gp3');
    submit();

    await waitFor(() => expect(result.volumes).toHaveLength(1));
    expect(result.volumes[0]).toEqual({
      ID: 'postgres-data',
      Name: 'postgres-data',
      Namespace: 'prod',
      PluginID: 'aws-ebs',
      ExternalID: 'vol-0abc123',
      RequestedCapabilities: [
        { AccessMode: 'single-node-writer', AttachmentMode: 'file-system' },
        { AccessMode: 'multi-node-reader-only', AttachmentMode: 'block-device' },
      ],
      MountOptions: { FSType: 'ext4', MountFlags: ['noatime'] },
      Parameters: { type: 'gp3' },
    });
  });

  test('asks for the fields Nomad requires and registers nothing', () => {
    const result = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Remove capability 1' }));
    submit();

    expect(screen.getAllByText('Required')).toHaveLength(2);
    expect(screen.getByText('Add at least one capability')).toBeTruthy();
    expect(result.volumes).toEqual([]);
  });

  test('shows the error of Nomad and keeps the form', async () => {
    const result = renderModal(async () => {
      throw { statusCode: 500, message: 'no CSI plugin named: aws-ebs could be found' };
    });

    type('Volume ID', 'postgres-data');
    type('External ID', 'vol-0abc123');
    submit();

    expect(await screen.findByText('no CSI plugin named: aws-ebs could be found')).toBeTruthy();
    expect(result.closed).toBe(0);
  });

  test('explains a permission error', async () => {
    renderModal(async () => {
      throw new PermissionError('Permission denied');
    });

    type('Volume ID', 'postgres-data');
    type('External ID', 'vol-0abc123');
    submit();

    expect(await screen.findByText(getPermissionErrorMessage('register-volume'))).toBeTruthy();
  });
});
