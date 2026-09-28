import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  test('renders its children', () => {
    render(<Badge variant="purple">periodic</Badge>);
    expect(screen.getByText('periodic')).toBeTruthy();
  });
});
