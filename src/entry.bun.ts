import { serveStatic } from 'hono/bun'
import { createApp } from './api/app'
import {
  parseExecParams,
  extractTokenFromTicket,
  buildNomadExecUrl,
} from './api/handlers/execWebSocket'

const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646'
const ticketSecret = process.env.TICKET_SECRET || 'nomad-compass-dev-secret-change-in-production'
const port = Number(process.env.PORT) || 3000

const app = createApp({
  envInjector: (c) => {
    c.env = { NOMAD_ADDR: nomadAddr, TICKET_SECRET: ticketSecret }
  },
  additionalCorsHeaders: ['X-Nomad-Token'],
})

// Serve static files from dist directory
app.use('/*', serveStatic({ root: './dist' }))

// SPA fallback - serve index.html for all unmatched routes
app.get('*', serveStatic({ path: './dist/index.html' }))

console.log(`Server running at http://localhost:${port}`)
console.log(`Using NOMAD_ADDR: ${nomadAddr}`)

// Store active WebSocket connections and their Nomad counterparts
const wsConnections = new Map<WebSocket, WebSocket>()

export default {
  port,
  async fetch(request: Request, server: { upgrade: (req: Request, options?: { data?: unknown }) => boolean }) {
    const url = new URL(request.url)

    // Handle WebSocket upgrade for exec endpoint
    if (
      url.pathname === '/api/ws/exec' &&
      request.headers.get('Upgrade')?.toLowerCase() === 'websocket'
    ) {
      const params = parseExecParams(url.searchParams)
      if (!params) {
        return new Response('Missing required parameters: allocId, task', { status: 400 })
      }

      // Validate ticket and extract real token from cookie
      const token = await extractTokenFromTicket(request, url.searchParams, ticketSecret)
      if (!token) {
        return new Response('Authentication required or ticket expired', { status: 401 })
      }

      // Upgrade the connection, passing params and token as data
      const success = server.upgrade(request, {
        data: { params, token, nomadAddr },
      })

      if (success) {
        return undefined // Bun handles the response
      }
      return new Response('WebSocket upgrade failed', { status: 500 })
    }

    // Handle regular HTTP requests
    return app.fetch(request)
  },
  websocket: {
    async open(ws: WebSocket & { data?: { params: { allocId: string; task: string; command: string[]; tty: boolean }; token: string; nomadAddr: string } }) {
      const { params, token, nomadAddr: addr } = ws.data || {}
      if (!params || !token) {
        ws.close(1008, 'Missing parameters')
        return
      }

      try {
        // Connect to Nomad WebSocket with token in URL
        const nomadUrl = buildNomadExecUrl(addr!, params, token)
        console.log('Connecting to Nomad exec:', nomadUrl.replace(/X-Nomad-Token=[^&]+/, 'X-Nomad-Token=***'))

        const nomadWs = new WebSocket(nomadUrl)

        // Store the connection pair
        wsConnections.set(ws, nomadWs)

        nomadWs.onopen = () => {
          console.log('Connected to Nomad exec endpoint')
        }

        // Relay: Nomad → Browser
        nomadWs.onmessage = (event) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(event.data)
          }
        }

        nomadWs.onclose = (event) => {
          console.log('Nomad connection closed:', event.code, event.reason)
          wsConnections.delete(ws)
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(event.code || 1000, event.reason || 'Nomad connection closed')
          }
        }

        nomadWs.onerror = (error) => {
          console.error('Nomad WebSocket error:', error)
          wsConnections.delete(ws)
          ws.close(1011, 'Nomad connection error')
        }
      } catch (error) {
        console.error('Failed to connect to Nomad:', error)
        const message = error instanceof Error ? error.message : 'Connection failed'
        ws.close(1011, message)
      }
    },
    message(ws: WebSocket, message: string | Buffer) {
      // Relay: Browser → Nomad
      const nomadWs = wsConnections.get(ws)
      if (nomadWs && nomadWs.readyState === WebSocket.OPEN) {
        nomadWs.send(message)
      }
    },
    close(ws: WebSocket) {
      // Clean up Nomad connection
      const nomadWs = wsConnections.get(ws)
      if (nomadWs) {
        nomadWs.close()
        wsConnections.delete(ws)
      }
    },
  },
}
