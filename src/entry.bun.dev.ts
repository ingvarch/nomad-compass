import { createApp } from './api/app';
import { createBunWebSocketHandlers } from './api/handlers/bunWebSocket';

// Development server - API only, Vite handles frontend
const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646';
const port = Number(process.env.PORT) || 3000;

// Dev-only fallback secret - NEVER use in production
const ticketSecret = process.env.TICKET_SECRET || 'dev-only-not-for-production';

const app = createApp({
  envInjector: (c) => {
    c.env = { NOMAD_ADDR: nomadAddr, TICKET_SECRET: ticketSecret };
  },
  additionalCorsHeaders: ['X-Nomad-Token'],
});

console.log(`API server running at http://localhost:${port}`);
console.log(`Using NOMAD_ADDR: ${nomadAddr}`);

const { handleUpgrade, websocket } = createBunWebSocketHandlers({
  nomadAddr,
  ticketSecret,
});

export default {
  port,
  async fetch(request: Request, server: { upgrade: (req: Request, options?: { data?: unknown }) => boolean }) {
    const url = new URL(request.url);

    // Handle WebSocket upgrade for exec endpoint
    const wsResponse = await handleUpgrade(request, server, url);
    if (wsResponse !== undefined) {
      return wsResponse;
    }

    // Handle regular HTTP requests
    return app.fetch(request);
  },
  websocket,
};
