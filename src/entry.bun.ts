import { serveStatic } from 'hono/bun';
import { createBunServer, createBunServerExport } from './lib/createBunServer';

const config = createBunServer({
  requireTicketSecret: true,
  addMiddleware: (app) => {
    // Serve static files from dist directory
    app.use('/*', serveStatic({ root: './dist' }));
    // SPA fallback - serve index.html for all unmatched routes
    app.get('*', serveStatic({ path: './dist/index.html' }));
  },
});

export default createBunServerExport(config);
