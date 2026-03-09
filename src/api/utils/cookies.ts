import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';

/**
 * Cookie configuration constants
 */
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Detect if the request is using HTTPS.
 */
export function isSecureContext(c: Context): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

/**
 * Set CSRF token cookie with consistent configuration.
 */
export function setCSRFCookie(c: Context, csrfToken: string): void {
  setCookie(c, 'csrf-token', csrfToken, {
    httpOnly: false, // Needs to be accessible by JavaScript for API calls
    secure: isSecureContext(c),
    sameSite: 'Strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * Set Nomad token cookie with consistent configuration.
 */
export function setNomadTokenCookie(c: Context, token: string): void {
  setCookie(c, 'nomad-token', token, {
    httpOnly: true,
    secure: isSecureContext(c),
    sameSite: 'Strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}
