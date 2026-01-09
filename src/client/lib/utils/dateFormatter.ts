/**
 * Date formatting utilities for Nomad timestamps.
 * Nomad uses nanosecond timestamps, so we need to convert them.
 */

/**
 * Format a nanosecond timestamp to a localized date string.
 * @param nanos - Timestamp in nanoseconds
 * @returns Formatted date string or '-' if invalid
 */
export function formatTimestamp(nanos: number): string {
  if (!nanos) return '-';
  const date = new Date(nanos / 1_000_000);
  return date.toLocaleString();
}
