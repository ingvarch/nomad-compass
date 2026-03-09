import type { Context } from 'hono';

/**
 * Standard error response format
 */
export function errorResponse(c: Context, message: string, status: number = 500) {
  return c.json({ error: message, status }, status as 400 | 401 | 403 | 404 | 500);
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(c: Context, message: string = 'Unauthorized') {
  return errorResponse(c, message, 401);
}

/**
 * Forbidden response
 */
export function forbiddenResponse(c: Context, message: string = 'Forbidden') {
  return errorResponse(c, message, 403);
}

/**
 * Bad request response
 */
export function badRequestResponse(c: Context, message: string = 'Bad request') {
  return errorResponse(c, message, 400);
}
