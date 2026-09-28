/**
 * Date formatting utilities for Nomad timestamps.
 * Nomad uses nanosecond timestamps, so we need to convert them.
 */

/** Nanoseconds to milliseconds conversion factor */
const NANOSECONDS_TO_MS = 1_000_000;

/** Nanoseconds to seconds conversion factor */
export const NANOSECONDS_TO_SECONDS = 1_000_000_000;

/**
 * Convert nanoseconds to seconds.
 * @param nanos - Value in nanoseconds
 * @returns Value in seconds (rounded)
 */
export function nanosToSeconds(nanos: number): number {
  return Math.round(nanos / NANOSECONDS_TO_SECONDS);
}

/**
 * Format nanoseconds as seconds string with "s" suffix.
 * @param nanos - Value in nanoseconds
 * @returns Formatted string (e.g., "30s") or "-" if invalid
 */
export function formatNanosAsSeconds(nanos: number | undefined): string {
  if (!nanos) return '-';
  return `${nanosToSeconds(nanos)}s`;
}

/** Options of the long date format */
const longDateOptions: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

/** Reusable date formatter for long format */
const longDateFormatter = new Intl.DateTimeFormat('en-GB', longDateOptions);

/** Long format with the short zone name */
const longZonedDateFormatter = new Intl.DateTimeFormat('en-GB', { ...longDateOptions, timeZoneName: 'short' });

/**
 * Format a nanosecond timestamp to a localized date string.
 * @param nanos - Timestamp in nanoseconds
 * @returns Formatted date string or '-' if invalid
 */
export function formatTimestamp(nanos: number): string {
  if (!nanos) return '-';
  const date = new Date(nanos / NANOSECONDS_TO_MS);
  return date.toLocaleString();
}

/**
 * Format a nanosecond timestamp to a detailed date string (e.g., "01 Jan 2024, 14:30:00").
 * @param nanos - Timestamp in nanoseconds
 * @returns Formatted date string or 'Unknown' if invalid
 */
export function formatDateLong(nanos: number): string {
  if (!nanos) return 'Unknown';
  const date = new Date(nanos / NANOSECONDS_TO_MS);
  return longDateFormatter.format(date);
}

/**
 * Format a nanosecond timestamp like formatDateLong, plus the local zone name.
 * @param nanos - Timestamp in nanoseconds
 * @returns Formatted date string (e.g., "28 Sep 2026 at 18:15:00 CEST") or 'Unknown' if invalid
 */
export function formatDateLongZoned(nanos: number): string {
  if (!nanos) return 'Unknown';
  return longZonedDateFormatter.format(new Date(nanos / NANOSECONDS_TO_MS));
}

/**
 * Format an ISO 8601 date (e.g. Nomad's NextPeriodicLaunch) like formatDateLong, plus the local zone name.
 * @param iso - Date string such as "2026-09-28T18:15:00+02:00"
 * @returns Formatted date string (e.g., "28 Sep 2026 at 18:15:00 CEST") or 'Unknown' if invalid
 */
export function formatIsoDateLong(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return longZonedDateFormatter.format(date);
}

/**
 * Format a nanosecond timestamp to a relative time string (e.g., "5m ago").
 * @param timestampNs - Timestamp in nanoseconds
 * @returns Relative time string
 */
export function formatTimeAgo(timestampNs: number): string {
  const ms = Date.now() - timestampNs / 1_000_000;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 10) return `${seconds}s ago`;
  return 'Just now';
}
