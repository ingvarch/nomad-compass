import { createApp } from './api/app'
import {
  parseExecParams,
  extractToken,
  buildNomadExecUrl,
} from './api/handlers/execWebSocket'

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

// Store active WebSocket connections and their Nomad counterparts
const wsConnections = new Map<WebSocket, WebSocket>()

export default {
  port,
  fetch(request: Request, server: { upgrade: (req: Request, options?: { data?: unknown }) => boolean }) {
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

      const token = extractToken(request, url.searchParams)
      if (!token) {
        return new Response('Authentication required', { status: 401 })
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
        const nomadWs = new WebSocket(nomadUrl)

        // Store the connection pair
        wsConnections.set(ws, nomadWs)

        // Relay: Nomad → Browser
        nomadWs.onmessage = (event) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(event.data)
          }
        }

        nomadWs.onclose = () => {
          wsConnections.delete(ws)
          if (ws.readyState === WebSocket.OPEN) {
            ws.close()
          }
        }

        nomadWs.onerror = () => {
          wsConnections.delete(ws)
          ws.close(1011, 'Nomad connection error')
        }
      } catch (error) {
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
