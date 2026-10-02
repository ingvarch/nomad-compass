import { describe, test, expect } from 'bun:test';
import { jobKind } from './jobKind';
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
