import { Hono } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import type { Env } from '../types'
import { generateCSRFToken, createTicket, timingSafeEqual } from '../utils/crypto'
import { badRequestResponse, unauthorizedResponse, forbiddenResponse, errorResponse } from '../utils/responses'

/**
 * Validates a Nomad token against the Nomad API
 * @returns true if token is valid, false otherwise
 */
async function validateNomadToken(nomadAddr: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${nomadAddr}/v1/agent/self`, {
      headers: {
        'X-Nomad-Token': token,
        'Content-Type': 'application/json',
      },
    })
    return response.ok
  } catch {
    return false
  }
}

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
      return badRequestResponse(c, 'Token is required')
    }

    const nomadAddr = c.env.NOMAD_ADDR
    if (!nomadAddr) {
      return errorResponse(c, 'Nomad server not configured')
    }

    // Validate token against Nomad API
    const isValid = await validateNomadToken(nomadAddr, token.trim())
    if (!isValid) {
      return unauthorizedResponse(c, 'Invalid token or failed to connect to Nomad')
    }

    // Detect secure context from request protocol (works in both Bun and CF Workers)
    const isSecure = new URL(c.req.url).protocol === 'https:';

    // Set nomad-token with httpOnly flag for security
    setCookie(c, 'nomad-token', token.trim(), {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'Strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    // Generate and set CSRF token (non-httpOnly so JS can access it)
    const csrfToken = generateCSRFToken()
    setCookie(c, 'csrf-token', csrfToken, {
      httpOnly: false, // Needs to be accessible by JavaScript for API calls
      secure: isSecure,
      sameSite: 'Strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return c.json({ success: true })
  } catch {
    return errorResponse(c, 'Login failed')
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
    return forbiddenResponse(c, 'Invalid CSRF token')
  }

  // Check authentication
  const token = getCookie(c, 'nomad-token')
  if (!token) {
    return unauthorizedResponse(c, 'Not authenticated')
  }

  // TICKET_SECRET must be set - no fallbacks for security
  const secret = c.env.TICKET_SECRET
  if (!secret) {
    return errorResponse(c, 'Server misconfigured: TICKET_SECRET not set')
  }
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

  const isValid = await validateNomadToken(nomadAddr, token)
  return c.json({ authenticated: isValid })
})
