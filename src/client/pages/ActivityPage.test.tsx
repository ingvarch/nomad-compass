import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ActivityPage from './ActivityPage';
import { mockFetch, type FetchCall } from '../../test/mockFetch';

const mockNamespaces = [
  { Name: 'default' },
  { Name: 'production' },
];

const mockAllocations = [
  {
    ID: 'alloc-1',
    JobID: 'web-service',
    Namespace: 'default',
    ClientStatus: 'running',
    TaskStates: {
      server: {
        State: 'running',
        Restarts: 0,
        Events: [
          {
            Type: 'Started',
            DisplayMessage: 'Task started by client',
            Time: (Date.now() - 60000) * 1_000_000,
            FailsTask: false,
          },
          {
            Type: 'Terminated',
            DisplayMessage: 'Task terminated with exit code 1',
            Time: (Date.now() - 120000) * 1_000_000,
            FailsTask: true,
          },
        ],
      },
    },
  },
  {
    ID: 'alloc-2',
    JobID: 'worker-job',
    Namespace: 'production',
    ClientStatus: 'running',
    TaskStates: {
      worker: {
        State: 'running',
        Restarts: 2,
        Events: [
          {
            Type: 'Restarting',
            DisplayMessage: 'Restarting task',
            Time: (Date.now() - 300000) * 1_000_000,
            FailsTask: false,
          },
        ],
      },
    },
  },
];

function handleActivityFetch({ url }: FetchCall) {
  if (url.startsWith('/api/nomad/v1/allocations')) return { body: mockAllocations };
  if (url.startsWith('/api/nomad/v1/namespaces')) return { body: mockNamespaces };
  return undefined;
}

describe('ActivityPage', () => {
  beforeEach(() => {
    mockFetch(handleActivityFetch);
  });

  it('renders search input always and hides advanced filters by default', async () => {
    render(
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>
    );

    // Page title and search input are present
    expect(await screen.findByText('Activity')).toBeTruthy();
    const searchInput = screen.getByPlaceholderText(/search job, task/i);
    expect(searchInput).toBeTruthy();

    // Filters toggle button should be collapsed by default
    const filterToggle = screen.getByRole('button', { name: /toggle filters/i });
    expect(filterToggle).toBeTruthy();
    expect(filterToggle.getAttribute('aria-expanded')).toBe('false');

    // Filter controls section should be collapsed
    const filtersPanel = screen.getByTestId('activity-filters-panel');
    expect(filtersPanel.className).toContain('grid-rows-[0fr]');
  });

  it('toggles advanced filters visibility when clicking the filter toggle button', async () => {
    render(
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Activity')).toBeTruthy();
    const filterToggle = screen.getByRole('button', { name: /toggle filters/i });
    const filtersPanel = screen.getByTestId('activity-filters-panel');

    // Initially collapsed
    expect(filterToggle.getAttribute('aria-expanded')).toBe('false');
    expect(filtersPanel.className).toContain('grid-rows-[0fr]');

    // Click to expand
    fireEvent.click(filterToggle);
    expect(filterToggle.getAttribute('aria-expanded')).toBe('true');
    expect(filtersPanel.className).toContain('grid-rows-[1fr]');

    // Click to collapse again
    fireEvent.click(filterToggle);
    expect(filterToggle.getAttribute('aria-expanded')).toBe('false');
    expect(filtersPanel.className).toContain('grid-rows-[0fr]');
  });

  it('filters events when typing into search input without expanding filters', async () => {
    render(
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>
    );

    expect(await screen.findAllByText('web-service')).toBeTruthy();
    expect(screen.getAllByText('worker-job').length).toBeGreaterThan(0);

    const searchInput = screen.getByPlaceholderText(/search job, task/i);
    fireEvent.change(searchInput, { target: { value: 'worker' } });

    // Only worker-job should remain
    expect(screen.queryByText('web-service')).toBeNull();
    expect(screen.getAllByText('worker-job').length).toBeGreaterThan(0);
  });

  it('shows active filter count badge and resets filters when reset button clicked', async () => {
    render(
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Activity')).toBeTruthy();

    // Expand filters
    const filterToggle = screen.getByRole('button', { name: /toggle filters/i });
    fireEvent.click(filterToggle);

    // Initially no active badge
    expect(screen.queryByTestId('active-filters-badge')).toBeNull();

    // Select an event type filter
    const startedButton = screen.getByRole('button', { name: 'Started' });
    fireEvent.click(startedButton);

    // Active filters badge should show count 1
    const badge = screen.getByTestId('active-filters-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('1');

    // Click Reset Filters
    const resetButton = screen.getByRole('button', { name: /reset filters/i });
    fireEvent.click(resetButton);

    // Active badge should be gone
    expect(screen.queryByTestId('active-filters-badge')).toBeNull();
  });

  it('clears search input when clear search button is clicked', async () => {
    render(
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Activity')).toBeTruthy();
    const searchInput = screen.getByPlaceholderText(/search job, task/i) as HTMLInputElement;

    // Type query
    fireEvent.change(searchInput, { target: { value: 'worker' } });
    expect(searchInput.value).toBe('worker');

    // Click clear button
    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearBtn);

    expect(searchInput.value).toBe('');
    expect(screen.queryByRole('button', { name: /clear search/i })).toBeNull();
  });

  it('filters events by severity using the dropdown', async () => {
    render(
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Activity')).toBeTruthy();

    // Expand filters
    const filterToggle = screen.getByRole('button', { name: /toggle filters/i });
    fireEvent.click(filterToggle);

    // Open Severity select
    const severitySelect = screen.getByRole('combobox', { name: /severity/i });
    fireEvent.click(severitySelect);

    // Select Error option
    const errorOption = screen.getByRole('option', { name: 'Error' });
    fireEvent.click(errorOption);

    // Only terminated event (error) should be shown
    expect(screen.getAllByText('Task terminated with exit code 1').length).toBeGreaterThan(0);
    expect(screen.queryByText('Task started by client')).toBeNull();

    // Active filter badge should be 1
    const badge = screen.getByTestId('active-filters-badge');
    expect(badge.textContent).toBe('1');
  });
});
