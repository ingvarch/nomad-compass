import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { nomadRoutes } from './routes/nomad'
import type { Env } from './types'

export function createApp() {
  const app = new Hono<{ Bindings: Env }>()

  // Enable CORS for all routes
  app.use('*', cors())

  // Protected page routes - check auth before serving static assets
  app.use('/dashboard/*', authMiddleware)
  app.use('/jobs/*', authMiddleware)

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
