import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { csrfMiddleware } from './api/middleware/csrf'
import { securityHeaders } from './api/middleware/security'
import { nomadRoutes } from './api/routes/nomad'
import type { Env } from './api/types'

// Development server - API only, Vite handles frontend
const app = new Hono<{ Bindings: Env }>()

// Apply security headers first
app.use('*', securityHeaders)

const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646'

// Inject environment variables FIRST
app.use('*', async (c, next) => {
  c.env = { NOMAD_ADDR: nomadAddr }
  await next()
})

// Restrictive CORS configuration - only allow necessary origins and methods
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Nomad-Token', 'X-CSRF-Token'],
  credentials: true, // Allow credentials to be included
}

app.use('*', cors(corsOptions))

// Apply CSRF protection to Nomad API routes (for state-changing operations)
app.use('/api/nomad/*', csrfMiddleware)

// API routes
app.route('/api/nomad', nomadRoutes)

// Config endpoint
app.get('/api/config', (c) =>
  c.json({ nomadAddr: c.env.NOMAD_ADDR })
)

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API server running at http://localhost:${info.port}`)
  console.log(`Using NOMAD_ADDR: ${nomadAddr}`)
})
