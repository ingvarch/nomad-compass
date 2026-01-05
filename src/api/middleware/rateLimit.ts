import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'

interface RateLimitConfig {
  windowMs: number
  max: number
}

interface RateLimitRecord {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// Note: For Cloudflare Workers at scale, consider using KV or Durable Objects
const store = new Map<string, RateLimitRecord>()

// Cleanup old entries periodically (every 5 minutes)
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 5 * 60 * 1000

function cleanupStore() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key)
    }
  }
  lastCleanup = now
}

/**
 * Creates a rate limiting middleware
 * @param config - Configuration object with windowMs and max requests
 * @returns Hono middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    // Periodic cleanup
    cleanupStore()

    // Get client IP from various headers (Cloudflare, proxies, or direct)
    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-real-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      'unknown'

    const now = Date.now()
    const key = `${ip}:${c.req.path}`
    const record = store.get(key)

    if (!record || now > record.resetTime) {
      // First request or window expired
      store.set(key, { count: 1, resetTime: now + config.windowMs })
    } else if (record.count >= config.max) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000)
      c.res.headers.set('Retry-After', String(retryAfter))
      c.res.headers.set('X-RateLimit-Limit', String(config.max))
      c.res.headers.set('X-RateLimit-Remaining', '0')
      c.res.headers.set('X-RateLimit-Reset', String(record.resetTime))
      return c.json({ error: 'Too many requests, please try again later' }, 429)
    } else {
      // Increment counter
      record.count++
    }

    // Add rate limit headers to response
    const remaining = config.max - (store.get(key)?.count || 0)
    c.res.headers.set('X-RateLimit-Limit', String(config.max))
    c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, remaining)))

    await next()
  })
}
