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

/**
 * Format a nanosecond timestamp to a relative time string (e.g., "2 hours ago").
 * @param nanos - Timestamp in nanoseconds
 * @returns Relative time string or '-' if invalid
 */
export function formatRelativeTime(nanos: number): string {
  if (!nanos) return '-';

  const date = new Date(nanos / 1_000_000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Format a nanosecond timestamp to ISO date string.
 * @param nanos - Timestamp in nanoseconds
 * @returns ISO date string or '-' if invalid
 */
export function formatISODate(nanos: number): string {
  if (!nanos) return '-';
  const date = new Date(nanos / 1_000_000);
  return date.toISOString();
}

/**
 * Format a Unix timestamp (seconds) to a localized date string.
 * @param seconds - Timestamp in seconds
 * @returns Formatted date string or '-' if invalid
 */
export function formatUnixTimestamp(seconds: number): string {
  if (!seconds) return '-';
  const date = new Date(seconds * 1000);
  return date.toLocaleString();
}
