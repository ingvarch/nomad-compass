/**
 * Shared WebSocket handler factory for Bun server entries.
 * Reduces duplication between entry.bun.ts and entry.bun.dev.ts.
 */

import {
  parseExecParams,
  extractTokenFromTicket,
  buildNomadExecUrl,
} from './execWebSocket';
import type { ExecParams } from '../../shared/types/exec';

interface BunWebSocketConfig {
  nomadAddr: string;
  ticketSecret: string;
  verbose?: boolean;
}

interface WebSocketData {
  params: ExecParams;
  token: string;
  nomadAddr: string;
}

type BunWebSocket = WebSocket & { data?: WebSocketData };

interface BunServer {
  upgrade: (req: Request, options?: { data?: unknown }) => boolean;
}

export function createBunWebSocketHandlers(config: BunWebSocketConfig) {
  const { nomadAddr, ticketSecret, verbose = false } = config;
  const wsConnections = new Map<WebSocket, WebSocket>();

  async function handleUpgrade(
    request: Request,
    server: BunServer,
    url: URL
  ): Promise<Response | undefined> {
    if (
      url.pathname !== '/api/ws/exec' ||
      request.headers.get('Upgrade')?.toLowerCase() !== 'websocket'
    ) {
      return undefined;
    }

    const params = parseExecParams(url.searchParams);
    if (!params) {
      return new Response('Missing required parameters: allocId, task', { status: 400 });
    }

    const token = await extractTokenFromTicket(request, url.searchParams, ticketSecret);
    if (!token) {
      return new Response('Authentication required or ticket expired', { status: 401 });
    }

    const success = server.upgrade(request, {
      data: { params, token, nomadAddr },
    });

    if (success) {
      return undefined;
    }
    return new Response('WebSocket upgrade failed', { status: 500 });
  }

  const websocket = {
    async open(ws: BunWebSocket) {
      const { params, token, nomadAddr: addr } = ws.data || {};
      if (!params || !token) {
        ws.close(1008, 'Missing parameters');
        return;
      }

      try {
        const nomadUrl = buildNomadExecUrl(addr!, params, token);
        if (verbose) {
          console.log('Connecting to Nomad exec:', nomadUrl.replace(/X-Nomad-Token=[^&]+/, 'X-Nomad-Token=***'));
        }

        const nomadWs = new WebSocket(nomadUrl);
        wsConnections.set(ws, nomadWs);

        if (verbose) {
          nomadWs.onopen = () => {
            console.log('Connected to Nomad exec endpoint');
          };
        }

        nomadWs.onmessage = (event) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        nomadWs.onclose = (event) => {
          if (verbose) {
            console.log('Nomad connection closed:', event.code, event.reason);
          }
          wsConnections.delete(ws);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(event.code || 1000, event.reason || 'Nomad connection closed');
          }
        };

        nomadWs.onerror = (error) => {
          if (verbose) {
            console.error('Nomad WebSocket error:', error);
          }
          wsConnections.delete(ws);
          ws.close(1011, 'Nomad connection error');
        };
      } catch (error) {
        if (verbose) {
          console.error('Failed to connect to Nomad:', error);
        }
        const message = error instanceof Error ? error.message : 'Connection failed';
        ws.close(1011, message);
      }
    },

    message(ws: WebSocket, message: string | Buffer) {
      const nomadWs = wsConnections.get(ws);
      if (nomadWs && nomadWs.readyState === WebSocket.OPEN) {
        nomadWs.send(message);
      }
    },

    close(ws: WebSocket) {
      const nomadWs = wsConnections.get(ws);
      if (nomadWs) {
        nomadWs.close();
        wsConnections.delete(ws);
      }
    },
  };

  return { handleUpgrade, websocket };
}
