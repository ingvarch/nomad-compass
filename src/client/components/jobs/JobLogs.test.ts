import { describe, test, expect } from 'bun:test';
import { logsErrorMessage } from './JobLogs';
import { PermissionError } from '../../lib/errors';

describe('logsErrorMessage', () => {
  test('explains the read-logs capability for a permission error', () => {
    expect(logsErrorMessage(new PermissionError('denied'))).toBe(
      'You do not have permission to view logs. The read-logs capability is required.'
    );
  });

  test('hints at permissions for a 500 from Nomad and keeps its reason', () => {
    expect(logsErrorMessage({ statusCode: 500, message: 'rpc error' })).toBe(
      'Unable to fetch logs: rpc error. This may be due to insufficient permissions (read-logs capability required) or the allocation may no longer be available.'
    );
  });

  test('shows the Nomad message for other errors, even when it contains "500"', () => {
    expect(logsErrorMessage({ statusCode: 404, message: 'unknown allocation 5003f1' })).toBe(
      'unknown allocation 5003f1'
    );
  });
});
