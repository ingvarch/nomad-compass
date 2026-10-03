import { describe, test, expect } from 'bun:test';
import {
  getErrorMessage,
  getPermissionErrorMessage,
  isJobModifyIndexConflict,
  PermissionError,
  withPermissionMessage,
} from './errors';

describe('withPermissionMessage', () => {
  test('replaces a permission error with the message of the operation', async () => {
    const run = withPermissionMessage('browse-files', async () => {
      throw new PermissionError('Permission denied');
    });

    await expect(run).rejects.toThrow(getPermissionErrorMessage('browse-files'));
    await expect(run).rejects.toBeInstanceOf(PermissionError);
  });

  test('passes the result and other errors through', async () => {
    expect(await withPermissionMessage('browse-files', async () => 42)).toBe(42);

    const apiError = { statusCode: 500, message: 'No cluster leader' };
    await expect(
      withPermissionMessage('browse-files', async () => {
        throw apiError;
      })
    ).rejects.toBe(apiError);
  });
});

describe('getErrorMessage', () => {
  test('returns the message of a Nomad API error', () => {
    expect(getErrorMessage({ statusCode: 500, message: 'Invalid cron spec' }, 'fallback')).toBe('Invalid cron spec');
  });

  test('keeps the fallback for unknown values', () => {
    expect(getErrorMessage({ foo: 1 }, 'fallback')).toBe('fallback');
  });

  test('uses the operation message for permission errors', () => {
    expect(getErrorMessage(new PermissionError('denied'), 'fallback', 'delete-job')).toBe(
      'You do not have permission to delete jobs'
    );
  });
});

// The ACL checks of Nomad's CSIVolume and CSIPlugin endpoints
describe('CSI permission messages', () => {
  test.each([
    ['list-volumes', ['csi-list-volume']],
    ['read-volume', ['csi-read-volume']],
    ['register-volume', ['csi-write-volume', 'plugin policy of read']],
    ['deregister-volume', ['csi-write-volume']],
    ['snapshot-volume', ['csi-write-volume', 'plugin policy of read']],
    ['list-plugins', ['plugin policy of list']],
    ['read-plugins', ['plugin policy of read']],
  ])('%s names what Nomad checks', (operation, needs) => {
    for (const need of needs) {
      expect(getPermissionErrorMessage(operation)).toContain(need);
    }
  });
});

describe('isJobModifyIndexConflict', () => {
  test('detects an EnforceIndex conflict', () => {
    const error = { statusCode: 500, message: 'Enforcing job modify index 11: job exists with conflicting job modify index: 15' };
    expect(isJobModifyIndexConflict(error)).toBe(true);
  });

  test('ignores other errors', () => {
    expect(isJobModifyIndexConflict({ statusCode: 500, message: 'job not found' })).toBe(false);
  });
});
