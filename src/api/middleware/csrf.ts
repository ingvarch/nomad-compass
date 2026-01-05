import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import type { Env } from '../types'

/**
 * CSRF protection middleware for state-changing requests
 */
export const csrfMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const method = c.req.method
    
    // Only validate CSRF for state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCookie(c, 'csrf-token')
      const requestToken = c.req.header('X-CSRF-Token')
      
      if (!csrfToken || !requestToken || csrfToken !== requestToken) {
        return c.json({ error: 'Invalid CSRF token' }, 403)
      }
    }
    
    await next()
  }
)