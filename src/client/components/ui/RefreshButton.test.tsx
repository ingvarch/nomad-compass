import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { RefreshButton } from './RefreshButton';

describe('RefreshButton', () => {
  test('renders icon-glyph button by default without text letters', () => {
    render(<RefreshButton onClick={() => {}} />);

    const button = screen.getByRole('button', { name: /refresh/i });
    expect(button).toBeTruthy();
    // In icon-only mode, the visible button text content should be empty (glyph svg only)
    expect(button.textContent?.trim()).toBe('');
    expect(button.getAttribute('aria-label')).toBe('Refresh');
    expect(button.getAttribute('title')).toBe('Refresh');
  });

  test('calls onClick handler when clicked', () => {
    let clicked = false;
    render(<RefreshButton onClick={() => { clicked = true; }} />);

    const button = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(button);
    expect(clicked).toBe(true);
  });
});
