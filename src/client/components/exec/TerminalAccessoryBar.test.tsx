import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import TerminalAccessoryBar from './TerminalAccessoryBar';

describe('TerminalAccessoryBar', () => {
  test('renders all accessory keys', () => {
    render(<TerminalAccessoryBar onSendInput={() => {}} />);

    expect(screen.getByRole('button', { name: 'Escape' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tab' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Interrupt (Control C)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'End of file (Control D)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Up arrow' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Down arrow' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear screen' })).toBeTruthy();
  });

  test('calls onSendInput with corresponding escape sequences', () => {
    const inputs: string[] = [];
    render(<TerminalAccessoryBar onSendInput={(val) => inputs.push(val)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Escape' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tab' }));
    fireEvent.click(screen.getByRole('button', { name: 'Interrupt (Control C)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Up arrow' }));

    expect(inputs).toEqual(['\x1b', '\t', '\x03', '\x1b[A']);
  });

  test('disables buttons when disabled is true', () => {
    const inputs: string[] = [];
    render(<TerminalAccessoryBar onSendInput={(val) => inputs.push(val)} disabled={true} />);

    const escBtn = screen.getByRole('button', { name: 'Escape' });
    expect(escBtn.hasAttribute('disabled')).toBe(true);

    fireEvent.click(escBtn);
    expect(inputs.length).toBe(0);
  });
});
