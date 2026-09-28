import { describe, test, expect } from 'bun:test';
import { validateJobForm } from './jobFormValidation';
import { defaultFormValues, defaultTaskGroupData, defaultTaskData, defaultPeriodicData } from '../../context/jobFormDefaults';
import type { NomadJobFormData } from '../../types/nomad';

function validForm(overrides: Partial<NomadJobFormData> = {}): NomadJobFormData {
  return {
    ...defaultFormValues,
    name: 'backup',
    taskGroups: [{ ...defaultTaskGroupData, name: 'backup', tasks: [{ ...defaultTaskData, name: 'backup', image: 'postgres:17' }] }],
    ...overrides,
  };
}

describe('validateJobForm', () => {
  test('accepts a valid form', () => {
    expect(validateJobForm(validForm(), 'create')).toBeNull();
  });

  test('requires a group name', () => {
    const form = validForm({ taskGroups: [{ ...validForm().taskGroups[0], name: ' ' }] });
    expect(validateJobForm(form, 'create')).toBe('Group 1 name is required');
  });

  test('requires a cron expression when the schedule is on', () => {
    const form = validForm({ type: 'batch', periodic: { ...defaultPeriodicData, crons: ['  '] } });
    expect(validateJobForm(form, 'create')).toBe('Add at least one cron expression to the schedule');
  });

  test('accepts a schedule with a cron expression', () => {
    const form = validForm({ type: 'batch', periodic: { ...defaultPeriodicData, crons: ['', '0 3 * * *'] } });
    expect(validateJobForm(form, 'create')).toBeNull();
  });
});
