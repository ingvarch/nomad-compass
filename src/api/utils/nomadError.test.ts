import { describe, test, expect } from 'bun:test';
import { nomadErrorMessage } from './nomadError';

describe('nomadErrorMessage', () => {
  test('unwraps a nested Nomad error list', () => {
    const body = '1 error occurred:\n\t* 1 error occurred:\n\t* Invalid cron spec "not a cron": missing field(s)\n\n\n';
    expect(nomadErrorMessage(body)).toBe('Invalid cron spec "not a cron": missing field(s)');
  });

  test('joins several errors', () => {
    expect(nomadErrorMessage('2 errors occurred:\n\t* first\n\t* second\n\n')).toBe('first; second');
  });

  test('passes a plain message', () => {
    expect(nomadErrorMessage('job not found')).toBe('job not found');
  });

  test('reads Message from a JSON body', () => {
    expect(nomadErrorMessage('{"Message":"Permission denied"}')).toBe('Permission denied');
  });

  test('reads a lowercase message key', () => {
    expect(nomadErrorMessage('{"message":"denied"}')).toBe('denied');
  });

  test('falls back on a non-string JSON Message', () => {
    expect(nomadErrorMessage('{"Message":42}')).toBe('An error occurred while processing your request');
  });

  test('never passes a JSON body without a message', () => {
    expect(nomadErrorMessage('{"Index":15,"Conflict":{}}')).toBe('An error occurred while processing your request');
  });

  test('falls back on an HTML error page of a proxy in front of Nomad', () => {
    const page = '<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head></html>';
    expect(nomadErrorMessage(page, 'text/html; charset=UTF-8')).toBe('An error occurred while processing your request');
  });

  test('caps long messages at 500 characters', () => {
    expect(nomadErrorMessage('x'.repeat(600))).toHaveLength(500);
  });

  test('falls back on an empty body', () => {
    expect(nomadErrorMessage('')).toBe('An error occurred while processing your request');
  });
});
