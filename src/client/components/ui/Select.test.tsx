import { describe, it, expect, mock } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';

const options = [
  { value: 'all', label: 'All Namespaces' },
  { value: 'default', label: 'default' },
  { value: 'prod', label: 'production' },
];

describe('Select', () => {
  it('renders trigger with selected option label', () => {
    render(
      <Select
        value="default"
        onChange={() => {}}
        options={options}
      />
    );

    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(screen.getByText('default')).toBeTruthy();
  });

  it('renders label when provided', () => {
    render(
      <Select
        label="Namespace"
        value="all"
        onChange={() => {}}
        options={options}
      />
    );

    expect(screen.getByText('Namespace')).toBeTruthy();
  });

  it('opens menu on click and renders options', () => {
    render(
      <Select
        value="all"
        onChange={() => {}}
        options={options}
      />
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    expect(screen.getByRole('listbox')).toBeTruthy();
    const renderedOptions = screen.getAllByRole('option');
    expect(renderedOptions.length).toBe(3);
    expect(screen.getByText('production')).toBeTruthy();
  });

  it('calls onChange with selected value and closes menu', () => {
    const handleChange = mock();
    render(
      <Select
        value="all"
        onChange={handleChange}
        options={options}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    const prodOption = screen.getByText('production');
    fireEvent.click(prodOption);

    expect(handleChange).toHaveBeenCalledWith('prod');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes menu on Escape key press', () => {
    render(
      <Select
        value="all"
        onChange={() => {}}
        options={options}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
