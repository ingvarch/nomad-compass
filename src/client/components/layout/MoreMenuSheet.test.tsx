import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MoreMenuSheet from './MoreMenuSheet';
import { ThemeProvider } from '../../context/ThemeContext';

describe('MoreMenuSheet', () => {
  test('does not render when closed', () => {
    const { container } = render(
      <MemoryRouter>
        <ThemeProvider>
          <MoreMenuSheet
            isOpen={false}
            onClose={() => {}}
            nomadAddr="http://nomad.local:4646"
            onLogout={() => {}}
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders menu items and handles actions when open', () => {
    let closed = false;
    let loggedOut = false;

    render(
      <MemoryRouter>
        <ThemeProvider>
          <MoreMenuSheet
            isOpen={true}
            onClose={() => { closed = true; }}
            nomadAddr="http://nomad.local:4646"
            onLogout={() => { loggedOut = true; }}
            hasManagementAccess={true}
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Cluster & Menu')).toBeTruthy();
    expect(screen.getByText('Namespaces')).toBeTruthy();
    expect(screen.getByText('Nodes')).toBeTruthy();
    expect(screen.getByText('Servers & Raft')).toBeTruthy();
    expect(screen.getByText('All Allocations')).toBeTruthy();
    expect(screen.getByText('Failed Allocations')).toBeTruthy();
    expect(screen.getByText('ACL (Policies & Tokens)')).toBeTruthy();

    // Test close button
    const closeBtn = screen.getByRole('button', { name: /close menu/i });
    fireEvent.click(closeBtn);
    expect(closed).toBe(true);

    // Test logout button
    const logoutBtn = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(logoutBtn);
    expect(loggedOut).toBe(true);
  });

  test('shows Install App button when beforeinstallprompt event is fired', () => {
    let closed = false;
    render(
      <MemoryRouter>
        <ThemeProvider>
          <MoreMenuSheet
            isOpen={true}
            onClose={() => { closed = true; }}
            nomadAddr="http://nomad.local:4646"
            onLogout={() => {}}
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    const promptMock = () => Promise.resolve();
    const mockEvent = new Event('beforeinstallprompt');
    Object.assign(mockEvent, {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });

    fireEvent(window, mockEvent);

    const installBtn = screen.getByRole('button', { name: /install app/i });
    expect(installBtn).toBeTruthy();

    fireEvent.click(installBtn);
    expect(closed).toBe(true);
  });
});
