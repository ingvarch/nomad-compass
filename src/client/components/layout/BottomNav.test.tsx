import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';

describe('BottomNav', () => {
  test('renders all navigation tabs', () => {
    let moreClicked = false;
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNav onOpenMore={() => { moreClicked = true; }} />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Jobs')).toBeTruthy();
    expect(screen.getByText('Topology')).toBeTruthy();
    expect(screen.getByText('Activity')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();

    const moreBtn = screen.getByRole('button', { name: /open more menu/i });
    fireEvent.click(moreBtn);
    expect(moreClicked).toBe(true);
  });

  test('highlights active tab based on route', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/jobs']}>
        <BottomNav onOpenMore={() => {}} />
      </MemoryRouter>
    );

    const jobsLink = screen.getByText('Jobs').closest('a');
    expect(jobsLink?.className).toContain('text-blue-600');
  });
});
