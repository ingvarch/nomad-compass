import { createMiddleware } from 'hono/factory'
import { getCookie, setCookie } from 'hono/cookie'
import type { Env } from '../types'
import { generateCSRFToken } from '../utils/crypto'

/**
 * Auth middleware for protected routes.
 * Checks for nomad-token cookie before serving protected pages.
 * Redirects to login if token is missing.
 * Also handles CSRF token generation and validation.
 */
export const authMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const token = getCookie(c, 'nomad-token')

    if (!token) {
      return c.redirect('/auth/login')
    }

    // Generate CSRF token if not present
    const csrfToken = getCookie(c, 'csrf-token') || generateCSRFToken();
    // Detect secure context from request protocol (works in both Bun and CF Workers)
    const isSecure = new URL(c.req.url).protocol === 'https:';
    setCookie(c, 'csrf-token', csrfToken, {
      httpOnly: false, // Needs to be accessible by JavaScript for API calls
      secure: isSecure,
      sameSite: 'Strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days - consistent with login route
    });

    await next()
  }
)
