import { describe, test, expect } from 'bun:test';
import { getErrorMessage, PermissionError } from './errors';

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
