import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Env } from '../types'
import { badRequestResponse, errorResponse } from '../utils/responses'

// Valid Nomad API paths regex - only allow legitimate Nomad API endpoints
const VALID_NOMAD_PATHS = /^\/v1\/(agent|allocations|allocation|client|eval|evaluation|jobs|job|nodes|node|regions|status|operator|acl|sentinel|validate|deployment|deployments|search|namespaces|namespace|quota|quotas|system|variables|variable|vault|consul|services|service)\/?.*/

export const nomadRoutes = new Hono<{ Bindings: Env }>()

/**
 * Single catch-all proxy to Nomad API.
 * Replaces 6 dead route files with one simple handler.
 * Includes SSRF protection by validating paths and target URLs.
 * Token is read from httpOnly cookie for security.
 */
nomadRoutes.all('/*', async (c) => {
  const nomadPath = c.req.path.replace('/api/nomad', '')
  const url = new URL(c.req.url)
  // Read token from httpOnly cookie (set by /api/auth/login)
  const token = getCookie(c, 'nomad-token') || ''

  // Validate the requested path to prevent SSRF
  if (!VALID_NOMAD_PATHS.test(nomadPath)) {
    return badRequestResponse(c, 'Invalid path')
  }

  // Sanitize and validate the nomad path to prevent path traversal
  const sanitizedPath = nomadPath.replace(/(\.\.\/|\.\/)/g, '')
  if (sanitizedPath !== nomadPath) {
    return badRequestResponse(c, 'Invalid path')
  }

  // Construct target URL with validation
  const nomadAddr = c.env.NOMAD_ADDR
  // Ensure NOMAD_ADDR is a valid URL
  try {
    new URL(nomadAddr)
  } catch {
    return errorResponse(c, 'Invalid Nomad server configuration')
  }

  const targetUrl = `${nomadAddr}${sanitizedPath}${url.search}`

  // Ensure the target URL is going to the configured Nomad server
  if (!targetUrl.startsWith(nomadAddr)) {
    return badRequestResponse(c, 'Invalid target URL')
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
    let responseBody;

    try {
      // Try to parse the error as JSON to extract only the essential message
      const errorJson = JSON.parse(errorBody);
      // Only return safe error information
      responseBody = JSON.stringify({
        error: 'Request to Nomad API failed',
        status: response.status,
        message: errorJson.Message || errorJson.message || 'An error occurred while processing your request'
      });
    } catch {
      // If it's not JSON, return a generic error
      responseBody = JSON.stringify({
        error: 'Request to Nomad API failed',
        status: response.status,
        message: 'An error occurred while processing your request'
      });
    }

    return new Response(responseBody, {
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
