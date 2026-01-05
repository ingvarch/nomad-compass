import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { csrfMiddleware } from './middleware/csrf'
import { securityHeaders } from './middleware/security'
import { createRateLimiter } from './middleware/rateLimit'
import { nomadRoutes } from './routes/nomad'
import { authRoutes } from './routes/auth'
import type { Env } from './types'

export function createApp() {
  const app = new Hono<{ Bindings: Env }>()

  // Apply security headers first
  app.use('*', securityHeaders)

  // Restrictive CORS configuration - only allow necessary origins and methods
  const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-CSRF-Token'],
    credentials: true, // Allow credentials to be included
  }

  app.use('*', cors(corsOptions))

  // Rate limiting for auth endpoints - strict limit to prevent brute force
  app.use('/api/auth/*', createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }))

  // Rate limiting for API endpoints - normal limit
  app.use('/api/nomad/*', createRateLimiter({ windowMs: 60 * 1000, max: 100 }))

  // Protected page routes - check auth before serving static assets
  app.use('/dashboard/*', authMiddleware)
  app.use('/jobs/*', authMiddleware)

  // Auth routes (login/logout/validate) - no CSRF required for login
  app.route('/api/auth', authRoutes)

  // Apply CSRF protection to Nomad API routes (for state-changing operations)
  app.use('/api/nomad/*', csrfMiddleware)

  // API routes - proxy to Nomad
  app.route('/api/nomad', nomadRoutes)

  // Config endpoint - serves NOMAD_ADDR to client (without exposing token)
  app.get('/api/config', (c) =>
    c.json({
      nomadAddr: c.env.NOMAD_ADDR,
    })
  )

  return app
}
