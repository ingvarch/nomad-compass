import { serve } from '@hono/node-server'
import { createApp } from './api/app'

// Development server - API only, Vite handles frontend
const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646'

const app = createApp({
  envInjector: (c) => {
    c.env = { NOMAD_ADDR: nomadAddr }
  },
  // X-Nomad-Token header kept for backward compatibility
  additionalCorsHeaders: ['X-Nomad-Token'],
})

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API server running at http://localhost:${info.port}`)
  console.log(`Using NOMAD_ADDR: ${nomadAddr}`)
})
