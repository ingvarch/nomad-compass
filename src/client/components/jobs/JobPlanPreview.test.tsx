import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import JobPlanPreview from './JobPlanPreview';
import { formatIsoDateLong } from '../../lib/utils/dateFormatter';
import type { NomadJobPlanResponse } from '../../types/nomad';

function renderPreview(planResult: NomadJobPlanResponse) {
  render(
    <JobPlanPreview
      isOpen
      onClose={() => {}}
      onConfirm={() => {}}
      planResult={planResult}
      isLoading={false}
      error={null}
      isSubmitting={false}
    />
  );
}

describe('JobPlanPreview', () => {
  test('shows the next launch of a periodic job', () => {
    renderPreview({ Index: 1, NextPeriodicLaunch: '2026-09-28T18:15:00+02:00' });
    expect(screen.getByText(formatIsoDateLong('2026-09-28T18:15:00+02:00'))).toBeTruthy();
  });

  test('has no next launch for other jobs', () => {
    renderPreview({ Index: 1, NextPeriodicLaunch: null });
    expect(screen.queryByText('Next launch:')).toBeNull();
  });

  test('has no next launch for the zero time of Nomad 1.x', () => {
    renderPreview({ Index: 1, NextPeriodicLaunch: '0001-01-01T00:00:00Z' });
    expect(screen.queryByText('Next launch:')).toBeNull();
  });
});
