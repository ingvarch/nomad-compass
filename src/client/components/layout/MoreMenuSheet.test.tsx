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

  test('dismisses on swipe down on drag handle past threshold', () => {
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

    const handle = screen.getByTestId('sheet-drag-handle');
    fireEvent.touchStart(handle, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(handle, { touches: [{ clientY: 250 }] });
    fireEvent.touchEnd(handle);

    expect(closed).toBe(true);
  });

  test('does not dismiss when swipe down on drag handle is below threshold', () => {
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

    const handle = screen.getByTestId('sheet-drag-handle');
    fireEvent.touchStart(handle, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(handle, { touches: [{ clientY: 110 }] });
    fireEvent.touchEnd(handle);

    expect(closed).toBe(false);
  });

  test('dismisses on mouse drag down on handle past threshold', () => {
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

    const handle = screen.getByTestId('sheet-drag-handle');
    fireEvent.mouseDown(handle, { clientY: 100 });
    fireEvent.mouseMove(window, { clientY: 250 });
    fireEvent.mouseUp(window);

    expect(closed).toBe(true);
  });

  test('closes when backdrop is clicked', () => {
    let closed = false;
    const { container } = render(
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

    // The backdrop has aria-hidden="true"
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(closed).toBe(true);
    }
  });
});
