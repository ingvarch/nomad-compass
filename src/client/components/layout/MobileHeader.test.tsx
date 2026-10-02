import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileHeader from './MobileHeader';
import { ThemeProvider } from '../../context/ThemeContext';

describe('MobileHeader', () => {
  test('renders logo and create button on top-level dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ThemeProvider>
          <MobileHeader />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('ovoo')).toBeTruthy();
    const logoImgs = screen.getAllByAltText('ovoo');
    expect(logoImgs.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: /create job/i })).toBeTruthy();
  });

  test('renders back button on nested route', () => {
    render(
      <MemoryRouter initialEntries={['/jobs/nginx-job']}>
        <ThemeProvider>
          <MobileHeader />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /go back/i })).toBeTruthy();
    expect(screen.getByText('Job Details')).toBeTruthy();
  });
});
