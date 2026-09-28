import { describe, test, expect } from 'bun:test';
import { Hono } from 'hono';
import { securityHeaders } from './security';

const app = new Hono();
app.use('*', securityHeaders);
app.get('/', (c) => c.text('ok'));

async function hsts(url: string, headers: Record<string, string> = {}) {
  const res = await app.request(url, { headers });
  return res.headers.get('Strict-Transport-Security');
}

describe('securityHeaders HSTS', () => {
  test('is not sent over plain http', async () => {
    expect(await hsts('http://compass.local/')).toBeNull();
  });

  test('is sent over https', async () => {
    expect(await hsts('https://compass.example.com/')).toContain('max-age=63072000');
  });

  test('is sent behind a proxy chain that starts with https', async () => {
    expect(await hsts('http://compass:3000/', { 'X-Forwarded-Proto': 'https, http' })).toContain('max-age=63072000');
  });
});
