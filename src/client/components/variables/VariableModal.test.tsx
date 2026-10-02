import { describe, test, expect, mock } from 'bun:test';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VariableModal from './VariableModal';
import { NomadNamespace } from '../../types/nomad';

const mockNamespaces: NomadNamespace[] = [
  { Name: 'default', Description: 'Default' },
  { Name: 'prod', Description: 'Production' },
];

describe('VariableModal', () => {
  test('renders create form correctly', () => {
    render(
      <VariableModal
        isOpen={true}
        onClose={() => {}}
        onSave={async () => {}}
        namespaces={mockNamespaces}
        currentNamespace="default"
      />
    );

    expect(screen.getByRole('heading', { name: 'Create Variable' })).toBeTruthy();
    expect(screen.getByLabelText(/Variable Path/i)).toBeTruthy();
    expect(screen.getByLabelText(/Namespace/i)).toBeTruthy();
    expect(screen.getByText(/Add Key-Value/i)).toBeTruthy();
  });

  test('submits valid data when form is saved', async () => {
    const handleSave = mock(async () => {});
    render(
      <VariableModal
        isOpen={true}
        onClose={() => {}}
        onSave={handleSave}
        namespaces={mockNamespaces}
        currentNamespace="prod"
      />
    );

    const pathInput = screen.getByLabelText(/Variable Path/i);
    fireEvent.change(pathInput, { target: { value: 'nomad/jobs/my-app' } });

    const keyInput = screen.getByPlaceholderText('KEY_1');
    fireEvent.change(keyInput, { target: { value: 'DB_PASSWORD' } });

    const valueInput = screen.getByPlaceholderText('Value');
    fireEvent.change(valueInput, { target: { value: 's3cr3t' } });

    await act(async () => {
      const submitBtn = screen.getByRole('button', { name: 'Create Variable' });
      fireEvent.click(submitBtn);
    });

    expect(handleSave).toHaveBeenCalledWith({
      Path: 'nomad/jobs/my-app',
      Namespace: 'prod',
      Items: { DB_PASSWORD: 's3cr3t' },
    });
  });

  test('switches to JSON mode and back', () => {
    render(
      <VariableModal
        isOpen={true}
        onClose={() => {}}
        onSave={async () => {}}
        namespaces={mockNamespaces}
        currentNamespace="default"
      />
    );

    const keyInput = screen.getByPlaceholderText('KEY_1');
    fireEvent.change(keyInput, { target: { value: 'FOO' } });
    const valueInput = screen.getByPlaceholderText('Value');
    fireEvent.change(valueInput, { target: { value: 'BAR' } });

    // Switch to JSON
    const jsonBtn = screen.getByRole('button', { name: /JSON/i });
    fireEvent.click(jsonBtn);

    const textarea = screen.getByPlaceholderText('{ "KEY": "value" }') as HTMLTextAreaElement;
    expect(textarea.value).toContain('"FOO": "BAR"');

    // Switch back to Form
    const formBtn = screen.getByRole('button', { name: /Form/i });
    fireEvent.click(formBtn);
    expect(screen.getByDisplayValue('FOO')).toBeTruthy();
  });

  test('renders edit mode with initial variable data', () => {
    render(
      <VariableModal
        isOpen={true}
        onClose={() => {}}
        onSave={async () => {}}
        initialVariable={{
          Path: 'nomad/jobs/existing-app',
          Namespace: 'default',
          Items: { API_KEY: 'secret123' },
          CreateIndex: 1,
          ModifyIndex: 2,
          CreateTime: 1000,
          ModifyTime: 2000,
        }}
        namespaces={mockNamespaces}
        currentNamespace="default"
      />
    );

    expect(screen.getByText('Edit Variable: nomad/jobs/existing-app')).toBeTruthy();
    const pathInput = screen.getByLabelText(/Variable Path/i);
    expect(pathInput.hasAttribute('disabled')).toBe(true);
    expect(screen.getByDisplayValue('API_KEY')).toBeTruthy();
    expect(screen.getByDisplayValue('secret123')).toBeTruthy();
  });
});
