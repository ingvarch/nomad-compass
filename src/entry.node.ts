import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './api/middleware/auth'
import { nomadRoutes } from './api/routes/nomad'
import type { Env } from './api/types'

const app = new Hono<{ Bindings: Env }>()

const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646'

// Inject environment variables FIRST
app.use('*', async (c, next) => {
  c.env = { NOMAD_ADDR: nomadAddr }
  await next()
})

app.use('*', cors())

// Protected routes
app.use('/dashboard/*', authMiddleware)
app.use('/jobs/*', authMiddleware)

// API routes
app.route('/api/nomad', nomadRoutes)

// Config endpoint
app.get('/api/config', (c) =>
  c.json({ nomadAddr: c.env.NOMAD_ADDR })
)

// Serve static files from dist directory
app.use('/*', serveStatic({ root: './dist' }))

// SPA fallback - serve index.html for all unmatched routes
app.get('*', serveStatic({ path: './dist/index.html' }))

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`)
  console.log(`Using NOMAD_ADDR: ${nomadAddr}`)
})
