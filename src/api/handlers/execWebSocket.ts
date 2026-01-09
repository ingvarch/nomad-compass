/**
 * WebSocket handler for Remote Exec functionality.
 * Relays messages between browser and Nomad exec endpoint.
 */

import { validateTicket } from '../utils/crypto';
import type { ExecParams } from '../../shared/types/exec';

export type { ExecParams, ExecMessage } from '../../shared/types/exec';

/**
 * Build the Nomad exec WebSocket URL.
 */
export function buildNomadExecUrl(
  nomadAddr: string,
  params: ExecParams,
  token?: string
): string {
  const { allocId, task, command, tty } = params;
  const encodedCommand = encodeURIComponent(JSON.stringify(command));

  // Convert http(s) to ws(s)
  const wsAddr = nomadAddr.replace(/^http/, 'ws');

  const url = new URL(`${wsAddr}/v1/client/allocation/${allocId}/exec`);
  url.searchParams.set('task', task);
  url.searchParams.set('command', JSON.stringify(command));
  url.searchParams.set('tty', String(tty));

  // Add token as query param for WebSocket (browsers/Workers can't set headers for WS)
  if (token) {
    url.searchParams.set('X-Nomad-Token', token);
  }

  return url.toString();
}

/**
 * Parse exec parameters from URL search params.
 */
export function parseExecParams(searchParams: URLSearchParams): ExecParams | null {
  const allocId = searchParams.get('allocId');
  const task = searchParams.get('task');
  const commandStr = searchParams.get('command');
  const tty = searchParams.get('tty') === 'true';

  if (!allocId || !task) {
    return null;
  }

  // Default command is shell
  let command: string[];
  if (commandStr) {
    try {
      command = JSON.parse(commandStr);
    } catch {
      command = ['/bin/sh'];
    }
  } else {
    command = ['/bin/sh'];
  }

  return { allocId, task, command, tty };
}

/**
 * Extract token from cookie header.
 */
function extractTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'nomad-token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Validate ticket and extract real token from cookie.
 * Uses short-lived signed ticket for WebSocket auth instead of exposing real token in URL.
 *
 * @param request - The incoming request (for cookie access)
 * @param searchParams - URL search params (for ticket)
 * @param secret - HMAC secret for ticket validation
 * @returns The real Nomad token if ticket is valid, null otherwise
 */
export async function extractTokenFromTicket(
  request: Request,
  searchParams: URLSearchParams,
  secret: string
): Promise<string | null> {
  const ticket = searchParams.get('ticket');
  if (!ticket) return null;

  // Validate ticket (30 second expiry)
  const isValid = await validateTicket(ticket, secret, 30000);
  if (!isValid) return null;

  // Get real token from cookie
  return extractTokenFromCookie(request);
}
