import { createBunServer, createBunServerExport } from './lib/createBunServer';

// Development server - API only, Vite handles frontend
// Note: TICKET_SECRET env var is required even in dev (no fallbacks for security)
const config = createBunServer({});

export default createBunServerExport(config);
