import { describe, test, expect } from 'bun:test';
import { countJobsByStatus, countJobsByNamespace } from './jobCounts';
import type { NomadJobListStub } from '../../types/nomad';

function stub(ID: string, Status: string, Namespace = 'default', ParentID = ''): NomadJobListStub {
  return { ID, ParentID, Name: ID, Namespace, Type: 'batch', Status, Stop: false, Periodic: false, SubmitTime: 0 };
}

const jobs = [
  stub('backup', 'running'),
  stub('backup/periodic-1790611797', 'running', 'default', 'backup'),
  stub('web', 'pending', 'prod'),
  stub('old', 'dead', 'prod'),
];

describe('countJobsByStatus', () => {
  test('counts jobs without periodic launches', () => {
    expect(countJobsByStatus(jobs)).toEqual({ running: 1, pending: 1, dead: 1 });
  });
});

describe('countJobsByNamespace', () => {
  test('counts jobs per namespace without periodic launches', () => {
    expect(Object.fromEntries(countJobsByNamespace(jobs))).toEqual({
      default: { total: 1, running: 1 },
      prod: { total: 2, running: 0 },
    });
  });
});
