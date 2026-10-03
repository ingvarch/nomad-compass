const UNITS = ['KiB', 'MiB', 'GiB', 'TiB'];

/**
 * Size in binary units, like "2.0 KiB". Bytes below 1 KiB stay whole.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${UNITS[unit]}`;
}
