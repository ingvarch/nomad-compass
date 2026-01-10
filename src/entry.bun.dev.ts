import { createBunServer, createBunServerExport } from './lib/createBunServer';

// Development server - API only, Vite handles frontend
const config = createBunServer({
  requireTicketSecret: false, // Use fallback in development
});

export default createBunServerExport(config);
