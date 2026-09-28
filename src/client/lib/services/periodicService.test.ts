import { describe, test, expect } from 'bun:test';
import { cronsOf, isPeriodicLaunch, listedJobs } from './periodicService';

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
