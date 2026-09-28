import { describe, test, expect } from 'bun:test';
import { allocationOutcome } from './useDeploymentTracker';
import type { NomadAllocation, NomadAllocationTaskState } from '../types/nomad';

const NOW = Date.parse('2026-09-28T12:00:00Z');

function task(state: NomadAllocationTaskState['State'], startedMsAgo?: number, failed = false): NomadAllocationTaskState {
  return {
    State: state,
    Failed: failed,
    Restarts: 0,
    Events:
      startedMsAgo === undefined
        ? []
        : [{ Type: 'Started', Time: (NOW - startedMsAgo) * 1_000_000, Message: '' }],
  };
}

function alloc(
  ClientStatus: NomadAllocation['ClientStatus'],
  TaskStates: Record<string, NomadAllocationTaskState> = {}
): Pick<NomadAllocation, 'ClientStatus' | 'TaskStates'> {
  return { ClientStatus, TaskStates };
}

describe('allocationOutcome', () => {
  test('a complete allocation is a success', () => {
    expect(allocationOutcome(alloc('complete', { backup: task('dead') }), NOW)).toEqual({ kind: 'complete' });
  });

  test('a failed allocation reports the failed task', () => {
    const failed = task('dead', undefined, true);
    failed.Events = [{ Type: 'Terminated', Time: 0, Message: 'Exit Code: 1', DisplayMessage: 'Exit Code: 1' }];

    expect(allocationOutcome(alloc('failed', { backup: failed }), NOW)).toEqual({
      kind: 'failed',
      error: 'Task "backup" failed: Exit Code: 1',
    });
  });

  test('a failed allocation without a failed task', () => {
    expect(allocationOutcome(alloc('failed'), NOW)).toEqual({ kind: 'failed', error: 'Allocation failed' });
  });

  test('a pending allocation is pulling', () => {
    expect(allocationOutcome(alloc('pending'), NOW)).toEqual({ kind: 'step', step: 'pulling' });
  });

  test('a running allocation with tasks up for over 3 seconds is a success', () => {
    expect(allocationOutcome(alloc('running', { web: task('running', 5000) }), NOW)).toEqual({ kind: 'complete' });
  });

  test('a running allocation with a task just started is starting', () => {
    expect(allocationOutcome(alloc('running', { web: task('running', 1000) }), NOW)).toEqual({
      kind: 'step',
      step: 'starting',
    });
  });

  test('a running allocation with a pending task is pulling', () => {
    expect(
      allocationOutcome(alloc('running', { web: task('running', 5000), sidecar: task('pending') }), NOW)
    ).toEqual({ kind: 'step', step: 'pulling' });
  });

  test('other statuses wait for the next poll', () => {
    expect(allocationOutcome(alloc('lost'), NOW)).toEqual({ kind: 'wait' });
  });
});
