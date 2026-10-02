import { describe, test, expect } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { mockFetch } from '../../test/mockFetch';
import { useChildJobs } from './useChildJobs';

const older = { ID: 'backup/periodic-1', ParentID: 'backup', SubmitTime: 1 };
const newer = { ID: 'backup/periodic-2', ParentID: 'backup', SubmitTime: 2 };

describe('useChildJobs', () => {
  test('loads the launches of a periodic job newest first', async () => {
    const calls = mockFetch(() => ({ body: [older, newer] }));
    const { result } = renderHook(() => useChildJobs('backup', 'default', 'periodic'));

    await waitFor(() => expect(result.current.data?.map((l) => l.ID)).toEqual([newer.ID, older.ID]));
    expect(calls[0].url).toBe('/api/nomad/v1/jobs?namespace=default&prefix=backup%2Fperiodic-');
  });

  test('loads the dispatched jobs of a parameterized job', async () => {
    const calls = mockFetch(() => ({ body: [] }));
    const { result } = renderHook(() => useChildJobs('export', 'default', 'parameterized'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls.map((c) => c.url)).toEqual(['/api/nomad/v1/jobs?namespace=default&prefix=export%2Fdispatch-']);
  });

  test('loads nothing for other jobs', async () => {
    const calls = mockFetch();
    const { result } = renderHook(() => useChildJobs('web', 'default', 'regular'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls).toHaveLength(0);
    expect(result.current.data).toEqual([]);
  });
});
