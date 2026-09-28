import { describe, test, expect } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { mockFetch } from '../../test/mockFetch';
import { usePeriodicLaunches } from './usePeriodicLaunches';

const older = { ID: 'backup/periodic-1', ParentID: 'backup', SubmitTime: 1 };
const newer = { ID: 'backup/periodic-2', ParentID: 'backup', SubmitTime: 2 };

describe('usePeriodicLaunches', () => {
  test('loads launches newest first', async () => {
    const calls = mockFetch(() => ({ body: [older, newer] }));
    const { result } = renderHook(() => usePeriodicLaunches('backup', 'default', true));

    await waitFor(() => expect(result.current.data?.map((l) => l.ID)).toEqual([newer.ID, older.ID]));
    expect(calls[0].url).toBe('/api/nomad/v1/jobs?namespace=default&prefix=backup%2Fperiodic-');
  });

  test('loads nothing for other jobs', async () => {
    const calls = mockFetch();
    const { result } = renderHook(() => usePeriodicLaunches('web', 'default', false));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls).toHaveLength(0);
    expect(result.current.data).toEqual([]);
  });
});
