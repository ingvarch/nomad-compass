/**
 * Cryptographic utilities for security operations.
 * Uses Web Crypto API which works in both Node.js 19+ and Cloudflare Workers.
 */

/**
 * Generates a cryptographically secure CSRF token.
 * @returns 64-character hex string (256 bits of entropy)
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Timing-safe string comparison to prevent timing attacks on token validation.
 * Works in both Node.js and Cloudflare Workers environments.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Perform dummy comparison to prevent length-based timing leaks
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ a.charCodeAt(i)
    }
    return false
  }

  // Constant-time comparison: XOR each character and accumulate differences
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Generate random hex string.
 */
export function generateRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create HMAC-SHA256 signature using Web Crypto API.
 */
async function createHmacSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify HMAC-SHA256 signature.
 */
async function verifyHmacSignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await createHmacSignature(data, secret)
  return timingSafeEqual(expected, signature)
}

/**
 * Create a signed ticket for WebSocket authentication.
 * Format: base64(timestamp|nonce|signature)
 * Ticket is valid for a short time (e.g., 30 seconds).
 */
export async function createTicket(secret: string): Promise<string> {
  const timestamp = Date.now().toString()
  const nonce = generateRandomHex(16)
  const data = `${timestamp}|${nonce}`
  const signature = await createHmacSignature(data, secret)
  const ticket = `${data}|${signature}`
  // Base64 encode for URL safety
  return btoa(ticket)
}

/**
 * Validate a signed ticket.
 * @param ticket - Base64-encoded ticket
 * @param secret - HMAC secret
 * @param maxAgeMs - Maximum age in milliseconds (e.g., 30000 for 30 sec)
 * @returns true if ticket is valid and not expired
 */
export async function validateTicket(
  ticket: string,
  secret: string,
  maxAgeMs: number
): Promise<boolean> {
  try {
    const decoded = atob(ticket)
    const parts = decoded.split('|')
    if (parts.length !== 3) return false

    const [timestamp, nonce, signature] = parts
    const data = `${timestamp}|${nonce}`

    // Verify signature
    const isValid = await verifyHmacSignature(data, signature, secret)
    if (!isValid) return false

    // Check expiry
    const ticketTime = parseInt(timestamp, 10)
    if (isNaN(ticketTime)) return false
    if (Date.now() - ticketTime > maxAgeMs) return false

    return true
  } catch {
    return false
  }
}
