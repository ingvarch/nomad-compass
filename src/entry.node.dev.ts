import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { nomadRoutes } from './api/routes/nomad'
import type { Env } from './api/types'

// Development server - API only, Vite handles frontend
const app = new Hono<{ Bindings: Env }>()

const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646'

// Inject environment variables FIRST
app.use('*', async (c, next) => {
  c.env = { NOMAD_ADDR: nomadAddr }
  await next()
})

app.use('*', cors())

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
