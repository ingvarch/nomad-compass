import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import type { Env } from '../types'
import { generateCSRFToken } from '../utils/crypto'
import { setCSRFCookie } from '../utils/cookies'

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
    setCSRFCookie(c, csrfToken);

    await next()
  }
)
