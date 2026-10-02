import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import VariableDetailModal from './VariableDetailModal';
import { NomadVariable } from '../../types/variables';

const mockVariable: NomadVariable = {
  Path: 'nomad/jobs/my-app',
  Namespace: 'default',
  Items: {
    DB_HOST: 'localhost',
    DB_PASS: 'supersecret',
  },
  CreateIndex: 10,
  ModifyIndex: 20,
  CreateTime: 1690000000000000,
  ModifyTime: 1695000000000000,
};

describe('VariableDetailModal', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mock(async () => {}),
      },
      configurable: true,
      writable: true,
    });
  });

  test('renders variable details and masked values by default', () => {
    render(
      <VariableDetailModal
        variable={mockVariable}
        isOpen={true}
        onClose={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByRole('heading', { name: 'Variable: nomad/jobs/my-app' })).toBeTruthy();
    expect(screen.getByText('default')).toBeTruthy();
    expect(screen.getByText('DB_HOST')).toBeTruthy();
    expect(screen.getByText('DB_PASS')).toBeTruthy();

    // Values should be masked initially
    expect(screen.queryByText('supersecret')).toBeNull();
    expect(screen.getAllByText('••••••••••••••••').length).toBe(2);
  });

  test('reveals all values when Reveal All Values is clicked', () => {
    render(
      <VariableDetailModal
        variable={mockVariable}
        isOpen={true}
        onClose={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    const revealBtn = screen.getByRole('button', { name: /Reveal All Values/i });
    fireEvent.click(revealBtn);

    expect(screen.getByText('localhost')).toBeTruthy();
    expect(screen.getByText('supersecret')).toBeTruthy();

    // Clicking again hides all
    const hideBtn = screen.getByRole('button', { name: /Hide All Values/i });
    fireEvent.click(hideBtn);
    expect(screen.queryByText('supersecret')).toBeNull();
  });

  test('calls onEdit and onDelete callbacks', () => {
    const handleEdit = mock(() => {});
    const handleDelete = mock(() => {});

    render(
      <VariableDetailModal
        variable={mockVariable}
        isOpen={true}
        onClose={() => {}}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    const editBtn = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockVariable);

    const deleteBtn = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith(mockVariable);
  });
});
