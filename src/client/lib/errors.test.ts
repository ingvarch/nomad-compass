import { describe, test, expect } from 'bun:test';
import { getErrorMessage, isJobModifyIndexConflict, PermissionError } from './errors';

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

describe('isJobModifyIndexConflict', () => {
  test('detects an EnforceIndex conflict', () => {
    const error = { statusCode: 500, message: 'Enforcing job modify index 11: job exists with conflicting job modify index: 15' };
    expect(isJobModifyIndexConflict(error)).toBe(true);
  });

  test('ignores other errors', () => {
    expect(isJobModifyIndexConflict({ statusCode: 500, message: 'job not found' })).toBe(false);
  });
});
