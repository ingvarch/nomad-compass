import { describe, test, expect } from 'bun:test';
import { jobFormReducer, initialState } from './jobFormReducer';
import { defaultFormValues, defaultTaskGroupData, defaultPeriodicData } from './jobFormDefaults';
import type { NomadJobFormData } from '../types/nomad';

function stateWith(formData: Partial<NomadJobFormData> = {}) {
  return { ...initialState, formData: { ...defaultFormValues, ...formData } };
}

describe('SET_JOB_TYPE', () => {
  test('batch turns off service discovery and health checks in every group', () => {
    const state = stateWith({
      taskGroups: [
        { ...defaultTaskGroupData, name: 'a', enableService: true, enableHealthCheck: true },
        { ...defaultTaskGroupData, name: 'b', enableService: true, enableHealthCheck: false },
      ],
    });
    const next = jobFormReducer(state, { type: 'SET_JOB_TYPE', payload: 'batch' });

    expect(next.formData?.type).toBe('batch');
    expect(next.formData?.taskGroups.map((g) => [g.enableService, g.enableHealthCheck])).toEqual([
      [false, false],
      [false, false],
    ]);
  });

  test('service drops the schedule', () => {
    const state = stateWith({ type: 'batch', periodic: { ...defaultPeriodicData } });
    const next = jobFormReducer(state, { type: 'SET_JOB_TYPE', payload: 'service' });

    expect(next.formData?.type).toBe('service');
    expect(next.formData?.periodic).toBeNull();
  });
});

describe('SET_SCHEDULE_ENABLED', () => {
  test('on starts from the default schedule', () => {
    const next = jobFormReducer(stateWith({ type: 'batch' }), { type: 'SET_SCHEDULE_ENABLED', payload: true });
    expect(next.formData?.periodic).toEqual(defaultPeriodicData);
  });

  test('off removes the schedule', () => {
    const state = stateWith({ type: 'batch', periodic: { ...defaultPeriodicData } });
    const next = jobFormReducer(state, { type: 'SET_SCHEDULE_ENABLED', payload: false });
    expect(next.formData?.periodic).toBeNull();
  });
});

describe('UPDATE_PERIODIC', () => {
  test('merges schedule fields', () => {
    const state = stateWith({ type: 'batch', periodic: { ...defaultPeriodicData } });
    const next = jobFormReducer(state, { type: 'UPDATE_PERIODIC', payload: { crons: ['@daily'], timeZone: 'Asia/Ulaanbaatar' } });

    expect(next.formData?.periodic).toEqual({ ...defaultPeriodicData, crons: ['@daily'], timeZone: 'Asia/Ulaanbaatar' });
  });

  test('does nothing without a schedule', () => {
    const state = stateWith();
    expect(jobFormReducer(state, { type: 'UPDATE_PERIODIC', payload: { timeZone: 'UTC' } })).toBe(state);
  });
});
