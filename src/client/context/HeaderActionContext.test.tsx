import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  HeaderActionProvider,
  useHeaderAction,
  useCurrentHeaderAction,
} from './HeaderActionContext';

describe('HeaderActionContext', () => {
  test('provides and updates header action', () => {
    let clicked = false;

    const Producer = () => {
      useHeaderAction({
        label: 'Create Test Item',
        onClick: () => { clicked = true; },
      });
      return <div>Producer</div>;
    };

    const Consumer = () => {
      const action = useCurrentHeaderAction();
      return (
        <div>
          <span data-testid="action-label">{action?.label || 'no-action'}</span>
          {action?.onClick && (
            <button onClick={action.onClick}>Trigger Action</button>
          )}
        </div>
      );
    };

    render(
      <HeaderActionProvider>
        <Consumer />
        <Producer />
      </HeaderActionProvider>
    );

    expect(screen.getByTestId('action-label').textContent).toBe('Create Test Item');
    const btn = screen.getByRole('button', { name: 'Trigger Action' });
    fireEvent.click(btn);
    expect(clicked).toBe(true);
  });
});
