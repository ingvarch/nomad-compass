import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import JobPlanPreview from './JobPlanPreview';
import { formatIsoDateLong } from '../../lib/utils/dateFormatter';
import type { NomadJobPlanResponse } from '../../types/nomad';

function renderPreview(planResult: NomadJobPlanResponse, isPeriodic = false) {
  render(
    <JobPlanPreview
      isOpen
      onClose={() => {}}
      onConfirm={() => {}}
      planResult={planResult}
      isLoading={false}
      error={null}
      isSubmitting={false}
      isPeriodic={isPeriodic}
    />
  );
}

const planWithPlacementFailure: NomadJobPlanResponse = {
  Index: 1,
  Annotations: { DesiredTGUpdates: { db: { Place: 1 } } },
  FailedTGAllocs: { db: { CoalescedFailures: 0, NodesEvaluated: 1, NodesFiltered: 1, NodesExhausted: 0 } },
};

function submitButton(name: string) {
  return screen.getByRole('button', { name }) as HTMLButtonElement;
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

  test('a periodic job gets its allocations at each launch, so placement failures only warn', () => {
    renderPreview(planWithPlacementFailure, true);

    expect(screen.getByText('Nomad creates allocations at each launch.')).toBeTruthy();
    expect(screen.queryByText(/new allocation/)).toBeNull();
    expect(screen.getByText('Placement Failures')).toBeTruthy();
    expect(screen.getByText('Launches wait until a node can run them.')).toBeTruthy();
    expect(submitButton('Confirm & Submit').disabled).toBe(false);
  });

  test('placement failures block the submit of other jobs', () => {
    renderPreview(planWithPlacementFailure);

    expect(screen.getByText(/new allocation will be created/)).toBeTruthy();
    expect(screen.queryByText('Nomad creates allocations at each launch.')).toBeNull();
    expect(screen.queryByText('Launches wait until a node can run them.')).toBeNull();
    expect(submitButton('Cannot Submit (Placement Failed)').disabled).toBe(true);
  });
});
