import { useEffect } from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  JobFormProvider,
  defaultFormValues,
  defaultPeriodicData,
  useJobFormContext,
  jobFormActions,
} from '../../../../context/JobFormContext';
import type { NomadJob, NomadJobFormData } from '../../../../types/nomad';
import JobTypeSection from './JobTypeSection';

// Puts the loaded job into the form state, as Edit does
function InitialJob({ type }: { type: string }) {
  const { dispatch } = useJobFormContext();
  useEffect(() => {
    dispatch(jobFormActions.setInitialJob({ ID: 'job', Name: 'job', Type: type } as NomadJob));
  }, [dispatch, type]);
  return null;
}

function renderSection(isEditMode = false, formData: NomadJobFormData = defaultFormValues, initialJobType?: string) {
  render(
    <JobFormProvider initialFormData={formData}>
      {initialJobType && <InitialJob type={initialJobType} />}
      <JobTypeSection isEditMode={isEditMode} />
    </JobFormProvider>
  );
}

describe('JobTypeSection', () => {
  test('shows the schedule only for batch jobs', () => {
    renderSection();
    expect(screen.queryByLabelText('Run on a schedule')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: 'Batch' }));

    expect(screen.getByLabelText('Run on a schedule')).toBeTruthy();
  });

  test('Service is checked by default until Batch is chosen', () => {
    renderSection();
    const service = screen.getByRole('radio', { name: 'Service' }) as HTMLInputElement;
    expect(service.checked).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: 'Batch' }));

    expect(service.checked).toBe(false);
    expect((screen.getByRole('radio', { name: 'Batch' }) as HTMLInputElement).checked).toBe(true);
  });

  test('turning the schedule on shows cron, time zone and overlap fields', () => {
    renderSection();
    fireEvent.click(screen.getByRole('radio', { name: 'Batch' }));
    fireEvent.click(screen.getByLabelText('Run on a schedule'));

    expect(screen.getByLabelText('Cron expressions 1')).toBeTruthy();
    expect((screen.getByLabelText('Time zone') as HTMLInputElement).value).toBe('UTC');
    expect(
      (screen.getByLabelText("Don't start a new run while the previous one is running") as HTMLInputElement).checked
    ).toBe(true);
  });

  test('adds a second cron expression', () => {
    renderSection();
    fireEvent.click(screen.getByRole('radio', { name: 'Batch' }));
    fireEvent.click(screen.getByLabelText('Run on a schedule'));
    fireEvent.click(screen.getByRole('button', { name: 'Add Expression' }));

    expect(screen.getByLabelText('Cron expressions 2')).toBeTruthy();
  });

  test('edit mode shows the type as text and locks the schedule switch', () => {
    renderSection(true, { ...defaultFormValues, type: 'batch', periodic: { ...defaultPeriodicData, crons: ['@daily'] } });

    expect(screen.queryByRole('radio')).toBeNull();
    expect((screen.getByLabelText('Run on a schedule') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Cron expressions 1') as HTMLInputElement).value).toBe('@daily');
  });

  test('edit mode shows the type label', () => {
    renderSection(true, { ...defaultFormValues, type: 'batch' }, 'batch');
    expect(screen.getByText('Batch')).toBeTruthy();
  });

  test('edit mode shows a type the form does not offer as is', () => {
    renderSection(true, defaultFormValues, 'sysbatch');
    expect(screen.getByText('sysbatch')).toBeTruthy();
  });

  test('edit mode shows the schedule of a periodic sysbatch job', () => {
    renderSection(true, { ...defaultFormValues, type: 'service', periodic: { ...defaultPeriodicData, crons: ['@daily'] } }, 'sysbatch');
    expect((screen.getByLabelText('Cron expressions 1') as HTMLInputElement).value).toBe('@daily');
  });
});
