import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children with default inline-flex class', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeTruthy();
    expect(button.className).toContain('inline-flex');
  });

  it('omits inline-flex when className contains display utilities like hidden', () => {
    render(<Button className="hidden sm:inline-flex">Responsive</Button>);
    const button = screen.getByRole('button', { name: 'Responsive' });
    expect(button.className).toContain('hidden');
    expect(button.className).toContain('sm:inline-flex');
    // It should not have base unprefixed inline-flex before hidden
    const classes = button.className.split(/\s+/);
    expect(classes.includes('inline-flex')).toBe(false);
  });

  it('handles loading state', () => {
    render(<Button isLoading>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button.textContent).toContain('Loading...');
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
