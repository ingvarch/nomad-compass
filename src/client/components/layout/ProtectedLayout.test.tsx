import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedLayout from './ProtectedLayout';

const mockLogout = mock(() => {});

mock.module('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    logout: mockLogout,
  }),
}));

mock.module('../../hooks/useAclPermissions', () => ({
  useAclPermissions: () => ({
    hasManagementAccess: true,
    isAdmin: true,
  }),
}));

mock.module('../../context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    effectiveTheme: 'dark',
    toggleTheme: () => {},
  }),
}));

describe('ProtectedLayout', () => {
  beforeEach(() => {
    global.fetch = mock(async () => ({
      ok: true,
      json: async () => ({ nomadAddr: 'http://localhost:4646' }),
    })) as unknown as typeof fetch;
  });

  test('renders BottomNav on standard routes', () => {
    render(
      <MemoryRouter initialEntries={['/jobs']}>
        <Routes>
          <Route element={<ProtectedLayout />}>
            <Route path="/jobs" element={<div>Jobs Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Jobs Content')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Mobile Navigation Bar' })).toBeTruthy();
  });

  test('hides BottomNav on exec routes', () => {
    render(
      <MemoryRouter initialEntries={['/exec/alloc-1/task-1']}>
        <Routes>
          <Route element={<ProtectedLayout />}>
            <Route path="/exec/:allocId/:task" element={<div>Exec Terminal Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Exec Terminal Content')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Mobile Navigation Bar' })).toBeNull();
  });
});
