import { serveStatic } from 'hono/bun'
import { createApp } from './api/app'

const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646'
const port = Number(process.env.PORT) || 3000

const app = createApp({
  envInjector: (c) => {
    c.env = { NOMAD_ADDR: nomadAddr }
  },
  additionalCorsHeaders: ['X-Nomad-Token'],
})

// Serve static files from dist directory
app.use('/*', serveStatic({ root: './dist' }))

// SPA fallback - serve index.html for all unmatched routes
app.get('*', serveStatic({ path: './dist/index.html' }))

console.log(`Server running at http://localhost:${port}`)
console.log(`Using NOMAD_ADDR: ${nomadAddr}`)

export default { port, fetch: app.fetch }
