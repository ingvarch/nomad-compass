import { describe, test, expect, mock } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import StringListEditor from './StringListEditor';

function renderEditor(values: string[], minRows = 0) {
  const onChange = mock((_values: string[]) => {});
  render(
    <StringListEditor label="Arguments" values={values} onChange={onChange} addLabel="Add Argument" minRows={minRows} />
  );
  return onChange;
}

describe('StringListEditor', () => {
  test('replaces the edited row', () => {
    const onChange = renderEditor(['-c', 'echo']);
    fireEvent.change(screen.getByLabelText('Arguments 2'), { target: { value: 'date' } });
    expect(onChange).toHaveBeenCalledWith(['-c', 'date']);
  });

  test('appends an empty row', () => {
    const onChange = renderEditor(['-c']);
    fireEvent.click(screen.getByRole('button', { name: 'Add Argument' }));
    expect(onChange).toHaveBeenCalledWith(['-c', '']);
  });

  test('removes a row', () => {
    const onChange = renderEditor(['-c', 'echo']);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Arguments 1' }));
    expect(onChange).toHaveBeenCalledWith(['echo']);
  });

  test('labels the rows as a group', () => {
    renderEditor(['-c']);
    expect(screen.getByRole('group', { name: 'Arguments' })).toBeDefined();
  });

  test('keeps the minimum number of rows', () => {
    renderEditor(['0 3 * * *'], 1);
    expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull();
  });
});
