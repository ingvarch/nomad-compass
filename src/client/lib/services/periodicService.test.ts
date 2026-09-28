import { describe, test, expect } from 'bun:test';
import {
  cronsOf,
  isPeriodicLaunch,
  listedJobs,
  sortLaunchesNewestFirst,
  launchAllocationCounts,
  setPeriodicEnabled,
  nextPeriodicLaunch,
  nextLaunchRefreshDelay,
  REFRESH_AFTER_LAUNCH_MS,
  scheduleState,
} from './periodicService';
import type { NomadJob, NomadJobListStub, NomadJobSummary } from '../../types/nomad';

describe('cronsOf', () => {
  test('returns Specs', () => {
    expect(cronsOf({ Enabled: true, Spec: '', Specs: ['0 3 * * *', '@hourly'], SpecType: 'cron', ProhibitOverlap: false })).toEqual([
      '0 3 * * *',
      '@hourly',
    ]);
  });

  test('falls back to the deprecated Spec', () => {
    expect(cronsOf({ Enabled: true, Spec: '@daily', SpecType: 'cron', ProhibitOverlap: false })).toEqual(['@daily']);
  });

  test('is empty without expressions', () => {
    expect(cronsOf({ Enabled: true, Spec: '', SpecType: 'cron', ProhibitOverlap: false })).toEqual([]);
  });
});

describe('isPeriodicLaunch', () => {
  test('is true for a launch of a periodic job', () => {
    expect(isPeriodicLaunch({ ID: 'backup/periodic-1790611797', ParentID: 'backup' })).toBe(true);
  });

  test('is false for a dispatched parameterized job', () => {
    expect(isPeriodicLaunch({ ID: 'sync/dispatch-1730972650-247c6e97', ParentID: 'sync' })).toBe(false);
  });

  test('is false for a job without a parent', () => {
    expect(isPeriodicLaunch({ ID: 'backup', ParentID: '' })).toBe(false);
  });
});

describe('listedJobs', () => {
  test('drops periodic launches', () => {
    const jobs = [
      { ID: 'backup', ParentID: '' },
      { ID: 'backup/periodic-1790611797', ParentID: 'backup' },
      { ID: 'sync/dispatch-1730972650-247c6e97', ParentID: 'sync' },
    ];
    expect(listedJobs(jobs).map((job) => job.ID)).toEqual(['backup', 'sync/dispatch-1730972650-247c6e97']);
  });
});

function launch(ID: string, SubmitTime: number, summary: NomadJobSummary['Summary'] = {}): NomadJobListStub {
  return {
    ID, ParentID: 'backup', Name: ID, Namespace: 'default', Type: 'batch', Status: 'dead', Stop: false,
    Periodic: false, SubmitTime,
    JobSummary: { JobID: ID, Summary: summary },
  };
}

describe('sortLaunchesNewestFirst', () => {
  test('sorts by submit time, newest first', () => {
    const sorted = sortLaunchesNewestFirst([launch('backup/periodic-1', 1), launch('backup/periodic-3', 3), launch('backup/periodic-2', 2)]);
    expect(sorted.map((l) => l.ID)).toEqual(['backup/periodic-3', 'backup/periodic-2', 'backup/periodic-1']);
  });
});

describe('launchAllocationCounts', () => {
  test('sums allocations over task groups', () => {
    const counts = launchAllocationCounts(launch('backup/periodic-1', 1, {
      db: { Running: 1, Starting: 0, Failed: 1, Complete: 2, Lost: 0, Unknown: 0 },
      files: { Running: 0, Starting: 0, Failed: 0, Complete: 1, Lost: 0, Unknown: 0 },
    }));
    expect(counts).toEqual({ running: 1, complete: 3, failed: 1 });
  });
});

describe('setPeriodicEnabled', () => {
  const job = {
    ID: 'backup', JobModifyIndex: 15,
    Periodic: { Enabled: true, Specs: ['@daily'], SpecType: 'cron', ProhibitOverlap: true },
  } as NomadJob;

  test('flips Enabled and enforces the read index', () => {
    expect(setPeriodicEnabled(job, false)).toEqual({
      Job: { ...job, Periodic: { ...job.Periodic!, Enabled: false } },
      EnforceIndex: true,
      JobModifyIndex: 15,
    });
  });

  test('rejects a job without a schedule', () => {
    expect(() => setPeriodicEnabled({ ...job, Periodic: null }, true)).toThrow('Job "backup" is not periodic');
  });
});

describe('nextPeriodicLaunch', () => {
  test('returns the next launch of a plan', () => {
    expect(nextPeriodicLaunch({ Index: 1, NextPeriodicLaunch: '2026-09-28T18:15:00+02:00' })).toBe('2026-09-28T18:15:00+02:00');
  });

  test('is null when Nomad sends none', () => {
    expect(nextPeriodicLaunch({ Index: 1, NextPeriodicLaunch: null })).toBeNull();
    expect(nextPeriodicLaunch({ Index: 1 })).toBeNull();
  });

  test('is null for the zero time of Nomad 1.x', () => {
    expect(nextPeriodicLaunch({ Index: 1, NextPeriodicLaunch: '0001-01-01T00:00:00Z' })).toBeNull();
  });
});

describe('nextLaunchRefreshDelay', () => {
  const next = '2026-09-28T18:15:00Z';

  test('waits until shortly after the next launch', () => {
    expect(nextLaunchRefreshDelay(next, Date.parse('2026-09-28T18:14:00Z'))).toBe(60_000 + REFRESH_AFTER_LAUNCH_MS);
  });

  test('does not wait for a next launch that has passed', () => {
    expect(nextLaunchRefreshDelay(next, Date.parse('2026-09-28T18:25:00Z'))).toBe(0);
  });

  test('caps the wait at the longest setTimeout delay', () => {
    // A longer delay makes setTimeout fire at once
    expect(nextLaunchRefreshDelay(next, Date.parse('2025-09-28T18:15:00Z'))).toBe(2 ** 31 - 1);
  });
});

describe('scheduleState', () => {
  const periodic = { Enabled: true, Specs: ['@daily'], SpecType: 'cron', ProhibitOverlap: true };

  test('is active for an enabled schedule of a running job', () => {
    expect(scheduleState({ Stop: false, Periodic: periodic })).toBe('active');
  });

  test('is paused for a disabled schedule', () => {
    expect(scheduleState({ Stop: false, Periodic: { ...periodic, Enabled: false } })).toBe('paused');
  });

  test('is stopped for a stopped job, whatever the schedule says', () => {
    expect(scheduleState({ Stop: true, Periodic: periodic })).toBe('stopped');
    expect(scheduleState({ Stop: true, Periodic: { ...periodic, Enabled: false } })).toBe('stopped');
  });
});
