import { describe, test, expect, mock } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { PeriodicActions } from './PeriodicActions';
import { buttonSecondaryStyles } from '../../../lib/styles';
import type { ScheduleState } from '../../../lib/services/periodicService';

function renderActions(state: ScheduleState, { isEnabled = state !== 'paused', isBusy = false } = {}) {
  const handlers = { onRunNow: mock(() => {}), onTogglePause: mock(() => {}) };
  render(<PeriodicActions state={state} isEnabled={isEnabled} isBusy={isBusy} {...handlers} />);
  return handlers;
}

function button(name: string) {
  return screen.getByRole('button', { name }) as HTMLButtonElement;
}

describe('PeriodicActions', () => {
  test('runs the job and pauses an active schedule', () => {
    const handlers = renderActions('active');
    fireEvent.click(button('Run now'));
    fireEvent.click(button('Pause'));

    expect(handlers.onRunNow).toHaveBeenCalledTimes(1);
    expect(handlers.onTogglePause).toHaveBeenCalledTimes(1);
  });

  test('a paused schedule can be resumed but not run', () => {
    renderActions('paused');

    expect(button('Run now').disabled).toBe(true);
    expect(button('Run now').title).toBe('Resume the schedule to run the job');
    expect(button('Resume').disabled).toBe(false);
  });

  test('a stopped job can be neither run nor paused', () => {
    renderActions('stopped');

    expect(button('Run now').disabled).toBe(true);
    expect(button('Run now').title).toBe('Start the job to run it');
    expect(button('Pause').disabled).toBe(true);
    expect(button('Pause').title).toBe('Start the job to change its schedule');
  });

  test('a stopped job with a paused schedule shows a disabled Resume', () => {
    renderActions('stopped', { isEnabled: false });
    expect(button('Resume').disabled).toBe(true);
  });

  test('busy disables both buttons', () => {
    renderActions('active', { isBusy: true });
    expect(button('Run now').disabled).toBe(true);
    expect(button('Pause').disabled).toBe(true);
  });

  test('Resume has its own icon', () => {
    renderActions('paused');
    const iconOf = (name: string) => button(name).querySelector('svg')?.getAttribute('class');
    expect(iconOf('Resume')).not.toBe(iconOf('Run now'));
  });

  test('Run now is a secondary button', () => {
    renderActions('active');
    expect(button('Run now').className).toContain(buttonSecondaryStyles);
  });
});
