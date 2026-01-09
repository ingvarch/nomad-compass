import { serveStatic } from 'hono/bun';
import { createApp } from './api/app';
import { createBunWebSocketHandlers } from './api/handlers/bunWebSocket';

const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646';
const ticketSecret = process.env.TICKET_SECRET || 'nomad-compass-dev-secret-change-in-production';
const port = Number(process.env.PORT) || 3000;

const app = createApp({
  envInjector: (c) => {
    c.env = { NOMAD_ADDR: nomadAddr, TICKET_SECRET: ticketSecret };
  },
  additionalCorsHeaders: ['X-Nomad-Token'],
});

// Serve static files from dist directory
app.use('/*', serveStatic({ root: './dist' }));

// SPA fallback - serve index.html for all unmatched routes
app.get('*', serveStatic({ path: './dist/index.html' }));

console.log(`Server running at http://localhost:${port}`);
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
