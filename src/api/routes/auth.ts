import { Hono } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import type { Env } from '../types'
import { generateCSRFToken, createTicket, timingSafeEqual } from '../utils/crypto'

export const authRoutes = new Hono<{ Bindings: Env }>()

/**
 * POST /api/auth/login
 * Validates token against Nomad API and sets httpOnly cookie
 */
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { token } = body as { token?: string }

    if (!token || typeof token !== 'string' || !token.trim()) {
      return c.json({ error: 'Token is required' }, 400)
    }

    const nomadAddr = c.env.NOMAD_ADDR
    if (!nomadAddr) {
      return c.json({ error: 'Nomad server not configured' }, 500)
    }

    // Validate token against Nomad API
    const response = await fetch(`${nomadAddr}/v1/agent/self`, {
      headers: {
        'X-Nomad-Token': token.trim(),
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return c.json({ error: 'Invalid token or failed to connect to Nomad' }, 401)
    }

    // Set nomad-token with httpOnly flag for security
    const isProduction = process.env.NODE_ENV === 'production'
    setCookie(c, 'nomad-token', token.trim(), {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    // Generate and set CSRF token (non-httpOnly so JS can access it)
    const csrfToken = generateCSRFToken()
    setCookie(c, 'csrf-token', csrfToken, {
      httpOnly: false, // Needs to be accessible by JavaScript for API calls
      secure: isProduction,
      sameSite: 'Strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return c.json({ success: true })
  } catch {
    return c.json({ error: 'Login failed' }, 500)
  }
})

/**
 * POST /api/auth/logout
 * Clears authentication cookies
 */
authRoutes.post('/logout', (c) => {
  deleteCookie(c, 'nomad-token', { path: '/' })
  deleteCookie(c, 'csrf-token', { path: '/' })
  return c.json({ success: true })
})

/**
 * POST /api/auth/ws-ticket
 * Returns a short-lived signed ticket for WebSocket authentication.
 * The real token never appears in the URL - only this opaque ticket.
 * Requires CSRF token for protection.
 */
authRoutes.post('/ws-ticket', async (c) => {
  // Validate CSRF token
  const csrfHeader = c.req.header('X-CSRF-Token')
  const csrfCookie = getCookie(c, 'csrf-token')

  if (!csrfHeader || !csrfCookie || !timingSafeEqual(csrfHeader, csrfCookie)) {
    return c.json({ error: 'Invalid CSRF token' }, 403)
  }

  // Check authentication
  const token = getCookie(c, 'nomad-token')
  if (!token) {
    return c.json({ error: 'Not authenticated' }, 401)
  }

  // Generate ticket (default secret for dev, should be set via env in production)
  const secret = c.env.TICKET_SECRET || 'nomad-compass-dev-secret-change-in-production'
  const ticket = await createTicket(secret)

  return c.json({ ticket })
})

/**
 * GET /api/auth/validate
 * Checks if user is authenticated by validating the token against Nomad
 */
authRoutes.get('/validate', async (c) => {
  const token = getCookie(c, 'nomad-token')

  if (!token) {
    return c.json({ authenticated: false })
  }

  const nomadAddr = c.env.NOMAD_ADDR
  if (!nomadAddr) {
    return c.json({ authenticated: false })
  }

  try {
    const response = await fetch(`${nomadAddr}/v1/agent/self`, {
      headers: {
        'X-Nomad-Token': token,
        'Content-Type': 'application/json',
      },
    })

    return c.json({ authenticated: response.ok })
  } catch {
    return c.json({ authenticated: false })
  }
})
