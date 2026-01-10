import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { csrfMiddleware } from './middleware/csrf'
import { securityHeaders } from './middleware/security'
import { createRateLimiter } from './middleware/rateLimit'
import { nomadRoutes } from './routes/nomad'
import { authRoutes } from './routes/auth'
import type { Env } from './types'

export interface CreateAppOptions {
  /**
   * Function to inject environment variables into context.
   * Required for Node.js where env vars come from process.env.
   * Cloudflare Workers get env from the bindings automatically.
   */
  envInjector?: (c: { env: Env }) => void

  /**
   * Additional CORS allowed headers beyond the defaults.
   * Default headers: ['Content-Type', 'X-CSRF-Token']
   */
  additionalCorsHeaders?: string[]
}

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono<{ Bindings: Env }>()

  // Apply security headers first
  app.use('*', securityHeaders)

  // Inject environment variables if provided (for Node.js)
  if (options.envInjector) {
    app.use('*', async (c, next) => {
      options.envInjector!(c as { env: Env })
      await next()
    })
  }

  // Restrictive CORS configuration - only allow necessary origins and methods
  const defaultHeaders = ['Content-Type', 'X-CSRF-Token']
  const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000']

  // Dynamic CORS middleware to access env from context (works in CF Workers)
  app.use('*', async (c, next) => {
    const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',') || defaultOrigins
    return cors({
      origin: allowedOrigins,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: [...defaultHeaders, ...(options.additionalCorsHeaders || [])],
      credentials: true,
    })(c, next)
  })

  // Rate limiting for auth login - strict limit to prevent brute force
  // Note: /api/auth/validate is excluded as it's called on every page load
  app.use('/api/auth/login', createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }))
  app.use('/api/auth/logout', createRateLimiter({ windowMs: 60 * 1000, max: 10 }))

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
