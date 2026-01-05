import { Hono } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import type { Env } from '../types'
import { generateCSRFToken } from '../utils/crypto'

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
  } catch (error) {
    console.error('Login error:', error)
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
