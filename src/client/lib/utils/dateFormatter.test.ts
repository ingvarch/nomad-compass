import { describe, test, expect } from 'bun:test';
import { formatIsoDateLong, formatDateLong } from './dateFormatter';

describe('formatIsoDateLong', () => {
  test('formats like formatDateLong and adds the local short zone name', () => {
    const nanos = Date.parse('2026-09-28T16:15:00Z') * 1_000_000;
    const zone = new Intl.DateTimeFormat('en-GB', { timeZoneName: 'short' })
      .formatToParts(new Date(nanos / 1_000_000))
      .find((part) => part.type === 'timeZoneName')?.value;

    expect(formatIsoDateLong('2026-09-28T18:15:00+02:00')).toBe(`${formatDateLong(nanos)} ${zone}`);
  });

  test('returns Unknown for an invalid date', () => {
    expect(formatIsoDateLong('not a date')).toBe('Unknown');
  });
});
