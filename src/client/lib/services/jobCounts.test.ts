import { describe, test, expect } from 'bun:test';
import { countJobsByStatus, countJobsByNamespace } from './jobCounts';
import type { NomadJobListStub } from '../../types/nomad';

function stub(ID: string, Status: string, Namespace = 'default', ParentID = ''): NomadJobListStub {
  return {
    ID, ParentID, Name: ID, Namespace, Type: 'batch', Status, Stop: false, Periodic: false, ParameterizedJob: false,
    SubmitTime: 0,
  };
}

const jobs = [
  stub('backup', 'running'),
  stub('backup/periodic-1790611797', 'running', 'default', 'backup'),
  stub('sync', 'running', 'prod'),
  stub('sync/dispatch-1730972650-247c6e97', 'pending', 'prod', 'sync'),
  stub('web', 'pending', 'prod'),
  stub('old', 'dead', 'prod'),
];

describe('countJobsByStatus', () => {
  test('counts jobs without periodic launches and dispatched jobs', () => {
    expect(countJobsByStatus(jobs)).toEqual({ running: 2, pending: 1, dead: 1 });
  });
});

describe('countJobsByNamespace', () => {
  test('counts jobs per namespace without periodic launches and dispatched jobs', () => {
    expect(Object.fromEntries(countJobsByNamespace(jobs))).toEqual({
      default: { total: 1, running: 1 },
      prod: { total: 3, running: 1 },
    });
  });
});
