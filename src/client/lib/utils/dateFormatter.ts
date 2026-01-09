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
