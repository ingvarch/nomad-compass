import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { JobFormProvider, defaultFormValues, defaultTaskGroupData } from '../../../context/JobFormContext';
import type { JobType, TaskGroupFormData } from '../../../types/nomad';
import TaskGroupForm from './TaskGroupForm';

function renderGroup(type: JobType, group: Partial<TaskGroupFormData> = {}) {
  render(
    <JobFormProvider initialFormData={{ ...defaultFormValues, type, taskGroups: [{ ...defaultTaskGroupData, ...group }] }}>
      <TaskGroupForm groupIndex={0} isFirst jobName="backup" />
    </JobFormProvider>
  );
}

describe('TaskGroupForm', () => {
  test('batch jobs have no service discovery or health check', () => {
    renderGroup('batch');
    expect(screen.queryByLabelText('Enable Service Discovery')).toBeNull();
    expect(screen.queryByLabelText('Enable Health Check')).toBeNull();
  });

  test('a batch group that already has a service still shows it', () => {
    renderGroup('batch', { enableService: true });
    expect((screen.getByLabelText('Enable Service Discovery') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByLabelText('Enable Health Check')).toBeTruthy();
  });

  test('service jobs keep service discovery and health check', () => {
    renderGroup('service');
    expect(screen.getByLabelText('Enable Service Discovery')).toBeTruthy();
    expect(screen.getByLabelText('Enable Health Check')).toBeTruthy();
  });
});
