import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PwaInstallPrompt from './PwaInstallPrompt';

describe('PwaInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('does not show install banner or update banner initially', () => {
    render(<PwaInstallPrompt />);
    expect(screen.queryByText(/Install ovoo/i)).toBeNull();
    expect(screen.queryByText(/Update available/i)).toBeNull();
  });

  test('shows update notification when ovoo-pwa-update-available event is fired', () => {
    render(<PwaInstallPrompt />);

    act(() => {
      window.dispatchEvent(new CustomEvent('ovoo-pwa-update-available'));
    });

    expect(screen.getByText(/Update available/i)).toBeTruthy();
    expect(screen.getByText(/New version of ovoo is ready/i)).toBeTruthy();

    // Dismiss update
    const dismissBtn = screen.getByRole('button', { name: /Dismiss update notification/i });
    fireEvent.click(dismissBtn);
    expect(screen.queryByText(/Update available/i)).toBeNull();
  });

  test('triggers prompt when Install is clicked', async () => {
    render(<PwaInstallPrompt />);

    const promptMock = mock(async () => {});
    const mockEvent = new Event('beforeinstallprompt');
    Object.assign(mockEvent, {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    expect(screen.getByText('Install ovoo')).toBeTruthy();
    const installBtn = screen.getByRole('button', { name: 'Install' });
    expect(installBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(installBtn);
    });
    expect(promptMock).toHaveBeenCalled();
    expect(screen.queryByText('Install ovoo')).toBeNull();
  });

  test('dismisses install banner and saves flag to localStorage', () => {
    render(<PwaInstallPrompt />);

    const mockEvent = new Event('beforeinstallprompt');
    Object.assign(mockEvent, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    const dismissBtn = screen.getByRole('button', { name: /Dismiss installation prompt/i });
    fireEvent.click(dismissBtn);

    expect(screen.queryByText('Install ovoo')).toBeNull();
    expect(localStorage.getItem('ovoo-pwa-install-dismissed')).toBe('true');
  });

  test('shows Safari instructions on iOS when How to is clicked', () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true,
    });

    render(<PwaInstallPrompt />);

    const howToBtn = screen.getByRole('button', { name: 'How to' });
    expect(howToBtn).toBeTruthy();

    fireEvent.click(howToBtn);
    expect(screen.getByText(/Tap the/i)).toBeTruthy();
    expect(screen.getByText(/Add to Home Screen/i)).toBeTruthy();

    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
  });
});
