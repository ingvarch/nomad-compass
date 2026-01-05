import { createApp } from './api/app'

// Development server - API only, Vite handles frontend
const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646'
const port = Number(process.env.PORT) || 3000

const app = createApp({
  envInjector: (c) => {
    c.env = { NOMAD_ADDR: nomadAddr }
  },
  additionalCorsHeaders: ['X-Nomad-Token'],
})

console.log(`API server running at http://localhost:${port}`)
console.log(`Using NOMAD_ADDR: ${nomadAddr}`)

export default { port, fetch: app.fetch }
