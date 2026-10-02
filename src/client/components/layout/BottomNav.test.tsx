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

  test('does not render any dot indicator between icon and text', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNav onOpenMore={() => {}} isMoreOpen={false} />
      </MemoryRouter>
    );

    // Verify there are no absolute dots (previously rounded-full bg-blue-600 with -bottom-1)
    const dots = container.querySelectorAll('.rounded-full.bg-blue-600, .rounded-full.dark\\:bg-monokai-blue');
    expect(dots.length).toBe(0);
  });

  test('does not render dot indicator when More menu is open', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNav onOpenMore={() => {}} isMoreOpen={true} />
      </MemoryRouter>
    );

    const dots = container.querySelectorAll('.rounded-full.bg-blue-600, .rounded-full.dark\\:bg-monokai-blue');
    expect(dots.length).toBe(0);
  });

  test('applies safe-area-inset-bottom style for Apple HIG compliance', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNav onOpenMore={() => {}} />
      </MemoryRouter>
    );

    const nav = screen.getByRole('navigation', { name: /mobile navigation bar/i });
    expect(nav.className).toContain('pb-safe');
  });
});
