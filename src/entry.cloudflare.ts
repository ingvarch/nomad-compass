import { createApp } from './api/app'
import {
  parseExecParams,
  extractToken,
  buildNomadExecUrl,
} from './api/handlers/execWebSocket'

const app = createApp()

// Serve static assets for non-API routes
app.get('*', (c) => c.env.ASSETS!.fetch(c.req.raw))

/**
 * Build Nomad exec URL without token (token goes in header).
 * Uses https:// because fetch() with Upgrade header handles the WebSocket upgrade.
 */
function buildNomadExecUrlForFetch(
  nomadAddr: string,
  params: { allocId: string; task: string; command: string[]; tty: boolean }
): string {
  const { allocId, task, command, tty } = params
  // Keep https:// - fetch with Upgrade header will upgrade to WebSocket
  const url = new URL(`${nomadAddr}/v1/client/allocation/${allocId}/exec`)
  url.searchParams.set('task', task)
  url.searchParams.set('command', JSON.stringify(command))
  url.searchParams.set('tty', String(tty))
  return url.toString()
}

/**
 * Handle WebSocket upgrade for exec endpoint.
 * Cloudflare Workers use WebSocketPair for client connection
 * and fetch() with Upgrade header for outbound Nomad connection (allows custom headers).
 */
async function handleExecWebSocket(
  request: Request,
  env: { NOMAD_ADDR: string }
): Promise<Response> {
  const url = new URL(request.url)
  const params = parseExecParams(url.searchParams)

  if (!params) {
    return new Response('Missing required parameters: allocId, task', { status: 400 })
  }

  const token = extractToken(request, url.searchParams)
  if (!token) {
    return new Response('Authentication required', { status: 401 })
  }

  // Build Nomad exec URL (without token - it goes in header)
  const nomadUrl = buildNomadExecUrlForFetch(env.NOMAD_ADDR, params)
  console.log('Connecting to Nomad:', nomadUrl)

  // Connect to Nomad using fetch with Upgrade header (allows custom headers!)
  try {
    const nomadResponse = await fetch(nomadUrl, {
      headers: {
        'Upgrade': 'websocket',
        'X-Nomad-Token': token,
      },
    })

    // @ts-expect-error webSocket is Cloudflare-specific property
    const nomadWs = nomadResponse.webSocket as WebSocket | undefined
    if (!nomadWs) {
      console.error('Failed to get WebSocket from Nomad response:', nomadResponse.status)
      return new Response('Failed to establish WebSocket with Nomad', { status: 502 })
    }

    // @ts-expect-error accept() is Cloudflare-specific
    nomadWs.accept()
    console.log('Connected to Nomad exec')

    // Create WebSocketPair for browser connection
    // @ts-expect-error WebSocketPair is a Cloudflare global
    const webSocketPair = new WebSocketPair()
    const [client, server] = Object.values(webSocketPair) as [WebSocket, WebSocket]

    // @ts-expect-error accept() is Cloudflare-specific
    server.accept()

    // Relay: Nomad → Browser
    nomadWs.addEventListener('message', (event: MessageEvent) => {
      try {
        server.send(event.data as string)
      } catch {
        // Server might be closed
      }
    })

    nomadWs.addEventListener('close', (event: CloseEvent) => {
      console.log('Nomad connection closed:', event.code, event.reason)
      try {
        server.close(event.code || 1000, event.reason || '')
      } catch {
        // Already closed
      }
    })

    nomadWs.addEventListener('error', () => {
      console.error('Nomad WebSocket error')
      try {
        server.close(1011, 'Nomad connection error')
      } catch {
        // Already closed
      }
    })

    // Relay: Browser → Nomad
    server.addEventListener('message', (event: MessageEvent) => {
      if (nomadWs.readyState === WebSocket.OPEN) {
        nomadWs.send(event.data as string)
      }
    })

    server.addEventListener('close', () => {
      console.log('Browser connection closed')
      nomadWs.close()
    })

    server.addEventListener('error', () => {
      console.error('Browser WebSocket error')
      nomadWs.close()
    })

    // Return the client side to the browser
    return new Response(null, {
      status: 101,
      // @ts-expect-error webSocket is Cloudflare-specific ResponseInit property
      webSocket: client,
    })

  } catch (error) {
    console.error('Failed to connect to Nomad:', error)
    return new Response('Failed to connect to Nomad', { status: 502 })
  }
}

// Export with fetch handler that checks for WebSocket upgrades
export default {
  async fetch(request: Request, env: { NOMAD_ADDR: string; ASSETS?: { fetch: (req: Request) => Promise<Response> } }) {
    const url = new URL(request.url)

    // Handle WebSocket upgrade for exec endpoint
    if (
      url.pathname === '/api/ws/exec' &&
      request.headers.get('Upgrade')?.toLowerCase() === 'websocket'
    ) {
      return handleExecWebSocket(request, env)
    }

    // Handle regular HTTP requests through Hono
    return app.fetch(request, env)
  },
}
