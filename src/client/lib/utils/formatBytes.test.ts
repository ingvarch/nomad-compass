import { describe, test, expect } from 'bun:test';
import { formatBytes } from './formatBytes';

describe('formatBytes', () => {
  test('shows bytes below 1 KiB as they are', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(153)).toBe('153 B');
  });

  test('uses binary units with one decimal', () => {
    expect(formatBytes(2048)).toBe('2.0 KiB');
    expect(formatBytes(1536)).toBe('1.5 KiB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MiB');
    expect(formatBytes(3.25 * 1024 ** 3)).toBe('3.3 GiB');
  });
});
