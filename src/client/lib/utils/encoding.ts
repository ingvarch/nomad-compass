/**
 * Base64 encoding/decoding utilities.
 * Centralized to avoid duplication across hooks.
 */

/**
 * Encode string to Base64.
 */
export function encodeBase64(data: string): string {
  return btoa(data);
}

/**
 * Decode Base64 to string (Latin-1).
 */
export function decodeBase64(data: string): string {
  return atob(data);
}

/**
 * Decode Base64 string to UTF-8 text.
 * atob() decodes to Latin-1, so we need to convert to UTF-8.
 */
export function decodeBase64Utf8(base64: string): string {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}
