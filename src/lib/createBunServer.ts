import { Hono } from 'hono';
import { createApp } from '../api/app';
import { createBunWebSocketHandlers } from '../api/handlers/bunWebSocket';
import type { Env } from '../api/types';

interface BunServerOptions {
  /** Whether to require TICKET_SECRET (production) or use fallback (dev) */
  requireTicketSecret: boolean;
  /** Function to add additional middleware (e.g., static file serving) */
  addMiddleware?: (app: Hono<{ Bindings: Env }>) => void;
}

interface BunServerConfig {
  nomadAddr: string;
  port: number;
  ticketSecret: string;
  app: Hono<{ Bindings: Env }>;
  handleUpgrade: ReturnType<typeof createBunWebSocketHandlers>['handleUpgrade'];
  websocket: ReturnType<typeof createBunWebSocketHandlers>['websocket'];
}

/**
 * Creates a Bun server configuration with shared setup logic.
 * Used by both production and development entry points.
 */
export function createBunServer(options: BunServerOptions): BunServerConfig {
  const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646';
  const port = Number(process.env.PORT) || 3000;

  // Handle TICKET_SECRET based on environment
  let ticketSecret: string;
  if (options.requireTicketSecret) {
    const secret = process.env.TICKET_SECRET;
    if (!secret) {
      throw new Error('TICKET_SECRET environment variable is required. Generate with: openssl rand -hex 32');
    }
    ticketSecret = secret;
  } else {
    ticketSecret = process.env.TICKET_SECRET || 'dev-only-not-for-production';
  }

  const app = createApp({
    envInjector: (c) => {
      c.env = { NOMAD_ADDR: nomadAddr, TICKET_SECRET: ticketSecret };
    },
    additionalCorsHeaders: ['X-Nomad-Token'],
  });

  // Add any additional middleware (e.g., static file serving for production)
  options.addMiddleware?.(app);

  console.log(`Server running at http://localhost:${port}`);
  console.log(`Using NOMAD_ADDR: ${nomadAddr}`);

  const { handleUpgrade, websocket } = createBunWebSocketHandlers({
    nomadAddr,
    ticketSecret,
  });

  return {
    nomadAddr,
    port,
    ticketSecret,
    app,
    handleUpgrade,
    websocket,
  };
}

/**
 * Creates the default export for a Bun server.
 */
export function createBunServerExport(config: BunServerConfig) {
  return {
    port: config.port,
    async fetch(request: Request, server: { upgrade: (req: Request, options?: { data?: unknown }) => boolean }) {
      const url = new URL(request.url);

      // Handle WebSocket upgrade for exec endpoint
      const wsResponse = await config.handleUpgrade(request, server, url);
      if (wsResponse !== undefined) {
        return wsResponse;
      }

      // Handle regular HTTP requests
      return config.app.fetch(request);
    },
    websocket: config.websocket,
  };
}
