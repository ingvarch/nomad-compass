import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'

/**
 * Security headers middleware
 */
export const securityHeaders = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    await next()

    // Set security headers
    c.res.headers.set('X-Content-Type-Options', 'nosniff')
    c.res.headers.set('X-Frame-Options', 'DENY')
    // Note: X-XSS-Protection is deprecated and can cause issues in modern browsers
    // CSP is the modern approach for XSS protection

    // Set Strict-Transport-Security when using HTTPS
    // Works in both Node.js and Cloudflare Workers
    if (c.req.url.startsWith('https://')) {
      c.res.headers.set(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload'
      )
    }

    // Set Content Security Policy
    // Note: 'unsafe-inline' for styles is needed for Tailwind CSS
    c.res.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " +
        "object-src 'none'; " +
        "base-uri 'self';"
    )
  }
)