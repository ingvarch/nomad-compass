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
