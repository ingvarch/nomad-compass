import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import type { Env } from '../types'

/**
 * Auth middleware for protected routes.
 * Checks for nomad-token cookie before serving protected pages.
 * Redirects to login if token is missing.
 */
export const authMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const token = getCookie(c, 'nomad-token')

    if (!token) {
      return c.redirect('/auth/login')
    }

    await next()
  }
)
