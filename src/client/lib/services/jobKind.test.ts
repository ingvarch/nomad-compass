import { describe, test, expect } from 'bun:test';
import { jobKind, listedJobs } from './jobKind';
import type { NomadParameterizedJobConfig, NomadPeriodicConfig } from '../../types/nomad';

const periodic: NomadPeriodicConfig = { Enabled: true, Specs: ['@daily'], SpecType: 'cron', ProhibitOverlap: true };
const parameterized: NomadParameterizedJobConfig = { Payload: 'optional', MetaRequired: null, MetaOptional: null };

describe('jobKind', () => {
  test('a job with a schedule is periodic', () => {
    expect(jobKind({ Periodic: periodic })).toBe('periodic');
  });

  test('a job with a parameterized block is parameterized', () => {
    expect(jobKind({ ParameterizedJob: parameterized })).toBe('parameterized');
  });

  // Both run as child jobs; Nomad dispatches such a job into a periodic child
  test('a scheduled parameterized job is periodic', () => {
    expect(jobKind({ Periodic: periodic, ParameterizedJob: parameterized })).toBe('periodic');
  });

  test('a dispatched job and a job without either block are regular', () => {
    expect(jobKind({ ParameterizedJob: parameterized, Dispatched: true })).toBe('regular');
    expect(jobKind({ Periodic: null, ParameterizedJob: null })).toBe('regular');
  });
});

describe('listedJobs', () => {
  test('drops periodic launches and dispatched jobs', () => {
    const jobs = [
      { ID: 'backup', ParentID: '' },
      { ID: 'backup/periodic-1790611797', ParentID: 'backup' },
      { ID: 'sync', ParentID: '' },
      { ID: 'sync/dispatch-1730972650-247c6e97', ParentID: 'sync' },
      // A periodic parameterized job: each dispatch is periodic and launches its own children
      { ID: 'report/dispatch-1730972650-0c8e3f1a', ParentID: 'report' },
      { ID: 'report/dispatch-1730972650-0c8e3f1a/periodic-1790611797', ParentID: 'report/dispatch-1730972650-0c8e3f1a' },
    ];
    expect(listedJobs(jobs).map((job) => job.ID)).toEqual(['backup', 'sync']);
  });
});
