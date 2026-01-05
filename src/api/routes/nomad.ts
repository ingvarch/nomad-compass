import { Hono } from 'hono'
import type { Env } from '../types'

// Valid Nomad API paths regex - only allow legitimate Nomad API endpoints
const VALID_NOMAD_PATHS = /^\/v1\/(agent|allocations|allocation|client|eval|evaluation|jobs|job|nodes|node|regions|status|operator|acl|sentinel|validate|deployment|deployments|search|namespaces|namespace|quota|quotas|system|variables|variable|vault|consul)\/?.*/

export const nomadRoutes = new Hono<{ Bindings: Env }>()

/**
 * Single catch-all proxy to Nomad API.
 * Replaces 6 dead route files with one simple handler.
 * Includes SSRF protection by validating paths and target URLs.
 */
nomadRoutes.all('/*', async (c) => {
  const nomadPath = c.req.path.replace('/api/nomad', '')
  const url = new URL(c.req.url)
  const token = c.req.header('X-Nomad-Token') || ''

  // Validate the requested path to prevent SSRF
  if (!VALID_NOMAD_PATHS.test(nomadPath)) {
    return c.json({ error: 'Invalid path' }, 400)
  }

  // Sanitize and validate the nomad path to prevent path traversal
  const sanitizedPath = nomadPath.replace(/(\.\.\/|\.\/)/g, '')
  if (sanitizedPath !== nomadPath) {
    return c.json({ error: 'Invalid path' }, 400)
  }

  // Construct target URL with validation
  const nomadAddr = c.env.NOMAD_ADDR
  // Ensure NOMAD_ADDR is a valid URL
  try {
    new URL(nomadAddr)
  } catch (e) {
    return c.json({ error: 'Invalid Nomad server configuration' }, 500)
  }

  const targetUrl = `${nomadAddr}${sanitizedPath}${url.search}`

  // Ensure the target URL is going to the configured Nomad server
  if (!targetUrl.startsWith(nomadAddr)) {
    return c.json({ error: 'Invalid target URL' }, 400)
  }

  const response = await fetch(targetUrl, {
    method: c.req.method,
    headers: {
      'X-Nomad-Token': token,
      'Content-Type': c.req.header('Content-Type') || 'application/json',
    },
    body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : c.req.raw.body,
  })

  // Sanitize error responses to prevent information disclosure
  if (!response.ok) {
    // For error responses, we should not expose internal details
    const errorBody = await response.text();
    let errorResponse;

    try {
      // Try to parse the error as JSON to extract only the essential message
      const errorJson = JSON.parse(errorBody);
      // Only return safe error information
      errorResponse = JSON.stringify({
        error: 'Request to Nomad API failed',
        status: response.status,
        message: errorJson.Message || errorJson.message || 'An error occurred while processing your request'
      });
    } catch {
      // If it's not JSON, return a generic error
      errorResponse = JSON.stringify({
        error: 'Request to Nomad API failed',
        status: response.status,
        message: 'An error occurred while processing your request'
      });
    }

    return new Response(errorResponse, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contentType = response.headers.get('Content-Type') || 'application/json'

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': contentType },
  })
})
