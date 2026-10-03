import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileHeader from './MobileHeader';
import { ThemeProvider } from '../../context/ThemeContext';
import { HeaderActionProvider, useHeaderAction } from '../../context/HeaderActionContext';

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

  test('renders back button and title on the files of an allocation', () => {
    render(
      <MemoryRouter initialEntries={['/allocations/1c7908c7-799d/files?path=%2Fserver']}>
        <ThemeProvider>
          <MobileHeader />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /go back/i })).toBeTruthy();
    expect(screen.getByText('Files')).toBeTruthy();
  });

  test.each([
    ['/storage', 'Storage'],
    ['/storage/volumes/test-volume%5B0%5D?namespace=default', 'Volume'],
    ['/storage/plugins/hostpath-plugin0', 'CSI Plugin'],
  ])('renders back button and title on %s', (path, title) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <ThemeProvider>
          <MobileHeader />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /go back/i })).toBeTruthy();
    expect(screen.getByText(title)).toBeTruthy();
  });

  test('renders back button instead of logo on /allocations', () => {
    render(
      <MemoryRouter initialEntries={['/allocations']}>
        <ThemeProvider>
          <MobileHeader />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /go back/i })).toBeTruthy();
    expect(screen.getByText('Allocations')).toBeTruthy();
    expect(screen.queryByText('ovoo')).toBeNull();
  });

  test('renders back button instead of logo on /acl and /nodes', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/acl']}>
        <ThemeProvider>
          <MobileHeader />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /go back/i })).toBeTruthy();
    expect(screen.queryByText('ovoo')).toBeNull();
    unmount();

    render(
      <MemoryRouter initialEntries={['/nodes']}>
        <ThemeProvider>
          <MobileHeader />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /go back/i })).toBeTruthy();
    expect(screen.queryByText('ovoo')).toBeNull();
  });

  test('renders plus button when custom headerAction is provided and handles click', () => {
    let clicked = false;
    const ActionSetter = () => {
      useHeaderAction({
        label: 'Create Test Resource',
        onClick: () => { clicked = true; },
      });
      return null;
    };

    render(
      <MemoryRouter initialEntries={['/namespaces']}>
        <ThemeProvider>
          <HeaderActionProvider>
            <ActionSetter />
            <MobileHeader />
          </HeaderActionProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const plusBtn = screen.getByRole('button', { name: 'Create Test Resource' });
    expect(plusBtn).toBeTruthy();
    fireEvent.click(plusBtn);
    expect(clicked).toBe(true);
  });
});
