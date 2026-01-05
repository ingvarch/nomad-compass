import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { csrfMiddleware } from './middleware/csrf'
import { securityHeaders } from './middleware/security'
import { nomadRoutes } from './routes/nomad'
import type { Env } from './types'

export function createApp() {
  const app = new Hono<{ Bindings: Env }>()

  // Apply security headers first
  app.use('*', securityHeaders)

  // Restrictive CORS configuration - only allow necessary origins and methods
  const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Nomad-Token', 'X-CSRF-Token'],
    credentials: true, // Allow credentials to be included
  }

  app.use('*', cors(corsOptions))

  // Protected page routes - check auth before serving static assets
  app.use('/dashboard/*', authMiddleware)
  app.use('/jobs/*', authMiddleware)

  // Apply CSRF protection to Nomad API routes (for state-changing operations)
  app.use('/api/nomad/*', csrfMiddleware)

  // API routes - proxy to Nomad
  app.route('/api/nomad', nomadRoutes)

  // Config endpoint - serves NOMAD_ADDR to client
  app.get('/api/config', (c) =>
    c.json({
      nomadAddr: c.env.NOMAD_ADDR,
    })
  )

  return app
}
