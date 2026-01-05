import { createApp } from './api/app'

const app = createApp()

// Serve static assets for non-API routes
app.get('*', (c) => c.env.ASSETS!.fetch(c.req.raw))

export default app
