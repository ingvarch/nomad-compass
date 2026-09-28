import { describe, test, expect, spyOn } from 'bun:test';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScheduleCard } from './ScheduleCard';
import { formatDateLongZoned, formatIsoDateLong } from '../../../lib/utils/dateFormatter';
import type { NomadJobListStub, NomadPeriodicConfig } from '../../../types/nomad';

const periodic: NomadPeriodicConfig = {
  Enabled: true, Spec: '', Specs: ['0 3 * * *', '@hourly'], SpecType: 'cron', ProhibitOverlap: true, TimeZone: 'Europe/Berlin',
};
const lastLaunch: NomadJobListStub = {
  ID: 'backup/periodic-1790611797', ParentID: 'backup', Name: 'backup/periodic-1790611797', Namespace: 'default',
  Type: 'batch', Status: 'dead', Stop: false, Periodic: false, SubmitTime: 1790611797886474000,
};

function renderCard(props: Partial<ComponentProps<typeof ScheduleCard>> = {}) {
  render(
    <MemoryRouter>
      <ScheduleCard
        periodic={periodic}
        state="active"
        nextLaunch={null}
        nextLaunchError={null}
        launchesLoading={false}
        launchesError={null}
        {...props}
      />
    </MemoryRouter>
  );
}

function valueOf(label: string) {
  return screen.getByText(label).nextElementSibling?.textContent;
}

describe('ScheduleCard', () => {
  test('shows every cron expression and the time zone', () => {
    renderCard();
    expect(screen.getByText('0 3 * * *')).toBeTruthy();
    expect(screen.getByText('@hourly')).toBeTruthy();
    expect(screen.getByText('Europe/Berlin')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
  });

  test('lists a cron expression given twice on two rows', () => {
    const consoleError = spyOn(console, 'error');
    try {
      // Nomad accepts duplicate expressions
      renderCard({ periodic: { ...periodic, Specs: ['@daily', '@daily'] } });
      expect(screen.getAllByText('@daily')).toHaveLength(2);
      expect(consoleError.mock.calls.flat().join(' ')).not.toContain('same key');
    } finally {
      consoleError.mockRestore();
    }
  });

  test('says that a launch is skipped while the previous one runs', () => {
    renderCard();
    expect(screen.getByText('Skips a run while the previous one is running')).toBeTruthy();
  });

  test('says when runs may overlap', () => {
    renderCard({ periodic: { ...periodic, ProhibitOverlap: false } });
    expect(screen.getByText('Runs may overlap')).toBeTruthy();
  });

  test('shows the next launch', () => {
    renderCard({ nextLaunch: '2026-09-28T18:15:00+02:00' });
    expect(screen.getByText(formatIsoDateLong('2026-09-28T18:15:00+02:00'))).toBeTruthy();
  });

  test('shows Unavailable with the reason when the plan fails', () => {
    renderCard({ nextLaunchError: 'Permission denied' });
    expect(valueOf('Next launch')).toBe('UnavailablePermission denied');
    expect(screen.getByText('Permission denied')).toBeTruthy();
  });

  test('a paused schedule has no next launch', () => {
    renderCard({ periodic: { ...periodic, Enabled: false }, state: 'paused' });
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.queryByText('Next launch')).toBeNull();
  });

  test('a stopped job has no next launch', () => {
    renderCard({ state: 'stopped' });
    expect(screen.getByText('Stopped')).toBeTruthy();
    expect(screen.queryByText('Active')).toBeNull();
    expect(screen.queryByText('Next launch')).toBeNull();
  });

  test('links the last launch with its zoned time', () => {
    renderCard({ lastLaunch });
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/jobs/backup%2Fperiodic-1790611797?namespace=default');
    expect(link.textContent).toBe(formatDateLongZoned(lastLaunch.SubmitTime));
  });

  test('says when there were no launches', () => {
    renderCard();
    expect(valueOf('Last launch')).toBe('No launches yet');
  });

  test('shows no last launch while the launches load', () => {
    renderCard({ launchesLoading: true });
    expect(valueOf('Last launch')).toBe('-');
  });

  test('keeps the last launch while the launches reload', () => {
    renderCard({ launchesLoading: true, lastLaunch });
    expect(screen.getByRole('link').textContent).toBe(formatDateLongZoned(lastLaunch.SubmitTime));
  });

  test('shows Unavailable with the reason when the launches fail to load', () => {
    renderCard({ launchesError: 'Failed to load launches' });
    expect(valueOf('Last launch')).toBe('UnavailableFailed to load launches');
  });
});
