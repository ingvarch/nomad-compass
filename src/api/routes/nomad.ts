import { Hono } from 'hono'
import type { Env } from '../types'

export const nomadRoutes = new Hono<{ Bindings: Env }>()

/**
 * Single catch-all proxy to Nomad API.
 * Replaces 6 dead route files with one simple handler.
 */
nomadRoutes.all('/*', async (c) => {
  const nomadPath = c.req.path.replace('/api/nomad', '')
  const url = new URL(c.req.url)
  const token = c.req.header('X-Nomad-Token') || ''

  const targetUrl = `${c.env.NOMAD_ADDR}${nomadPath}${url.search}`

  const response = await fetch(targetUrl, {
    method: c.req.method,
    headers: {
      'X-Nomad-Token': token,
      'Content-Type': c.req.header('Content-Type') || 'application/json',
    },
    body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : c.req.raw.body,
  })

  const contentType = response.headers.get('Content-Type') || 'application/json'

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': contentType },
  })
})
