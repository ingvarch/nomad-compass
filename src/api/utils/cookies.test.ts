import { describe, test, expect } from 'bun:test';
import { Hono, type Handler } from 'hono';
import { isSecureContext, setNomadTokenCookie } from './cookies';

function appWith(handler: Handler) {
  const app = new Hono();
  app.get('/', handler);
  return app;
}

const secureApp = appWith((c) => c.text(String(isSecureContext(c))));

async function isSecure(url: string, headers: Record<string, string> = {}) {
  const res = await secureApp.request(url, { headers });
  return res.text();
}

describe('isSecureContext', () => {
  test('plain http is not secure', async () => {
    expect(await isSecure('http://compass.local/')).toBe('false');
  });

  test('https request is secure', async () => {
    expect(await isSecure('https://compass.example.com/')).toBe('true');
  });

  test('http behind a TLS-terminating proxy is secure', async () => {
    expect(await isSecure('http://compass:3000/', { 'X-Forwarded-Proto': 'https' })).toBe('true');
  });

  test('uses the first value of a proxy chain', async () => {
    expect(await isSecure('http://compass:3000/', { 'X-Forwarded-Proto': 'https, http' })).toBe('true');
  });

  test('forwarded http stays not secure', async () => {
    expect(await isSecure('http://compass:3000/', { 'X-Forwarded-Proto': 'http' })).toBe('false');
  });
});

describe('setNomadTokenCookie', () => {
  const loginApp = appWith((c) => {
    setNomadTokenCookie(c, 'secret-token');
    return c.text('ok');
  });

  test('marks the cookie Secure behind a TLS-terminating proxy', async () => {
    const res = await loginApp.request('http://compass:3000/', {
      headers: { 'X-Forwarded-Proto': 'https' },
    });
    const cookie = res.headers.get('Set-Cookie') ?? '';

    expect(cookie).toContain('nomad-token=secret-token');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
  });
});
