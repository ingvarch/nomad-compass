import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './api/app'

const app = createApp()

// Inject environment variables from process.env
app.use('*', async (c, next) => {
  c.env = {
    NOMAD_ADDR: process.env.NOMAD_ADDR || 'http://localhost:4646',
  }
  await next()
})

// Serve static files from dist directory
app.use('/*', serveStatic({ root: './dist' }))

// SPA fallback - serve index.html for all unmatched routes
app.get('*', serveStatic({ path: './dist/index.html' }))

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`)
})
