/**
 * WebSocket handler for Remote Exec functionality.
 * Relays messages between browser and Nomad exec endpoint.
 */

export interface ExecParams {
  allocId: string;
  task: string;
  command: string[];
  tty: boolean;
}

export interface ExecMessage {
  // Client → Server (to Nomad)
  stdin?: { data?: string; close?: boolean };
  tty_size?: { height: number; width: number };

  // Server → Client (from Nomad)
  stdout?: { data: string };
  stderr?: { data: string };
  exited?: boolean;
  result?: { exit_code: number };
}

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
 * Validate token from cookie or query param.
 * For WebSocket, we accept token via query param since
 * browsers don't support custom headers during WS handshake.
 */
export function extractToken(
  request: Request,
  searchParams: URLSearchParams
): string | null {
  // Try query param first (WebSocket limitation)
  const tokenParam = searchParams.get('token');
  if (tokenParam) {
    return tokenParam;
  }

  // Fallback to cookie
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === 'nomad-token') {
        return decodeURIComponent(value);
      }
    }
  }

  return null;
}

/**
 * Base64 encode string for Nomad exec protocol.
 */
export function encodeStdin(data: string): string {
  // Use btoa for browser compatibility
  if (typeof btoa !== 'undefined') {
    return btoa(data);
  }
  // Node/Bun Buffer
  return Buffer.from(data).toString('base64');
}

/**
 * Base64 decode string from Nomad exec protocol.
 */
export function decodeOutput(data: string): string {
  // Use atob for browser compatibility
  if (typeof atob !== 'undefined') {
    return atob(data);
  }
  // Node/Bun Buffer
  return Buffer.from(data, 'base64').toString('utf-8');
}

/**
 * Create stdin message for Nomad.
 */
export function createStdinMessage(data: string): string {
  return JSON.stringify({
    stdin: { data: encodeStdin(data) }
  });
}

/**
 * Create close stdin message for Nomad.
 */
export function createCloseMessage(): string {
  return JSON.stringify({
    stdin: { close: true }
  });
}

/**
 * Create terminal resize message for Nomad.
 */
export function createResizeMessage(width: number, height: number): string {
  return JSON.stringify({
    tty_size: { width, height }
  });
}

/**
 * Parse message from Nomad and return decoded text for stdout/stderr.
 */
export function parseNomadMessage(data: string): {
  type: 'stdout' | 'stderr' | 'exit' | 'unknown';
  text?: string;
  exitCode?: number;
} {
  try {
    const msg = JSON.parse(data) as ExecMessage;

    if (msg.stdout?.data) {
      return { type: 'stdout', text: decodeOutput(msg.stdout.data) };
    }

    if (msg.stderr?.data) {
      return { type: 'stderr', text: decodeOutput(msg.stderr.data) };
    }

    if (msg.exited) {
      return { type: 'exit', exitCode: msg.result?.exit_code };
    }

    return { type: 'unknown' };
  } catch {
    return { type: 'unknown' };
  }
}
