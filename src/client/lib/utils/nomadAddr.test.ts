import { describe, test, expect } from 'bun:test';
import { parseNomadAddr } from './nomadAddr';

describe('parseNomadAddr', () => {
  test('parses http address', () => {
    const result = parseNomadAddr('http://nomad.example.com:4646');
    expect(result.isSecure).toBe(false);
    expect(result.displayAddr).toBe('nomad.example.com:4646');
  });

  test('parses https address', () => {
    const result = parseNomadAddr('https://nomad.example.com');
    expect(result.isSecure).toBe(true);
    expect(result.displayAddr).toBe('nomad.example.com');
  });

  test('handles address without scheme', () => {
    const result = parseNomadAddr('localhost:4646');
    expect(result.isSecure).toBe(false);
    expect(result.displayAddr).toBe('localhost:4646');
  });
});
