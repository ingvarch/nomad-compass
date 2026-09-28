import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobFormProvider, defaultFormValues } from '../../../context/JobFormContext';
import TaskForm from './TaskForm';

function renderTaskForm() {
  render(
    <JobFormProvider initialFormData={defaultFormValues}>
      <TaskForm groupIndex={0} taskIndex={0} isOnly />
    </JobFormProvider>
  );
}

describe('TaskForm command and arguments', () => {
  test('edits the command', () => {
    renderTaskForm();
    fireEvent.change(screen.getByLabelText('Command'), { target: { value: '/bin/sh' } });
    expect((screen.getByLabelText('Command') as HTMLInputElement).value).toBe('/bin/sh');
  });

  test('adds and edits an argument', () => {
    renderTaskForm();
    fireEvent.click(screen.getByRole('button', { name: 'Add Argument' }));
    fireEvent.change(screen.getByLabelText('Arguments 1'), { target: { value: '-c' } });
    expect((screen.getByLabelText('Arguments 1') as HTMLInputElement).value).toBe('-c');
  });

  test('focuses the new argument row', () => {
    renderTaskForm();
    fireEvent.click(screen.getByRole('button', { name: 'Add Argument' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Arguments 1'));
  });
});
