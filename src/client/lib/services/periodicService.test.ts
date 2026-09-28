import { describe, test, expect } from 'bun:test';
import { cronsOf } from './periodicService';

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
