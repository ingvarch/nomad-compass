import { useState, useRef, useCallback, useEffect } from 'react';

interface ExecMessage {
  // From Nomad
  stdout?: { data: string };
  stderr?: { data: string };
  exited?: boolean;
  result?: { exit_code: number };

  // To Nomad
  stdin?: { data?: string; close?: boolean };
  tty_size?: { height: number; width: number };
}

interface UseExecSessionOptions {
  allocId: string;
  task: string;
  command?: string[];
  tty?: boolean;
  onData?: (data: string) => void;
  onExit?: (exitCode: number) => void;
  onError?: (error: string) => void;
}

interface UseExecSessionReturn {
  isConnected: boolean;
  isConnecting: boolean;
  exitCode: number | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  sendInput: (data: string) => void;
  sendResize: (cols: number, rows: number) => void;
}

/**
 * Base64 encode string for Nomad exec protocol.
 */
function encodeBase64(data: string): string {
  return btoa(data);
}

/**
 * Base64 decode string from Nomad exec protocol.
 */
function decodeBase64(data: string): string {
  return atob(data);
}

/**
 * Get CSRF token from cookie.
 */
function getCsrfToken(): string | null {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1] || null;
}

/**
 * Fetch a short-lived ticket for WebSocket auth.
 * The actual token never appears in the URL - only this opaque ticket.
 */
async function fetchTicket(): Promise<string | null> {
  try {
    const csrfToken = getCsrfToken();
    const response = await fetch('/api/auth/ws-ticket', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRF-Token': csrfToken || '',
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.ticket || null;
  } catch {
    return null;
  }
}

/**
 * Hook for managing WebSocket exec session with Nomad.
 */
export function useExecSession({
  allocId,
  task,
  command = ['/bin/sh'],
  tty = true,
  onData,
  onExit,
  onError,
}: UseExecSessionOptions): UseExecSessionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(async () => {
    if (wsRef.current || isConnecting) return;

    setIsConnecting(true);
    setError(null);
    setExitCode(null);

    // Fetch a short-lived ticket (real token never in URL)
    const ticket = await fetchTicket();
    if (!ticket) {
      const err = 'Authentication required';
      setError(err);
      setIsConnecting(false);
      onError?.(err);
      return;
    }

    // Build WebSocket URL with ticket (not token)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = new URL(`${protocol}//${window.location.host}/api/ws/exec`);
    wsUrl.searchParams.set('allocId', allocId);
    wsUrl.searchParams.set('task', task);
    wsUrl.searchParams.set('command', JSON.stringify(command));
    wsUrl.searchParams.set('tty', String(tty));
    wsUrl.searchParams.set('ticket', ticket);

    const ws = new WebSocket(wsUrl.toString());

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg: ExecMessage = JSON.parse(event.data);

        if (msg.stdout?.data) {
          const decoded = decodeBase64(msg.stdout.data);
          onData?.(decoded);
        }

        if (msg.stderr?.data) {
          const decoded = decodeBase64(msg.stderr.data);
          onData?.(decoded);
        }

        if (msg.exited) {
          const code = msg.result?.exit_code ?? -1;
          setExitCode(code);
          onExit?.(code);
        }
      } catch {
        // Invalid message, ignore
      }
    };

    ws.onerror = () => {
      const err = 'WebSocket connection error';
      setError(err);
      onError?.(err);
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      setIsConnecting(false);
      wsRef.current = null;

      if (event.code !== 1000) {
        const err = event.reason || 'Connection closed unexpectedly';
        setError(err);
        onError?.(err);
      }
    };

    wsRef.current = ws;
  }, [allocId, task, command, tty, isConnecting, onData, onExit, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendInput = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: ExecMessage = {
        stdin: { data: encodeBase64(data) }
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: ExecMessage = {
        tty_size: { width: cols, height: rows }
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    exitCode,
    error,
    connect,
    disconnect,
    sendInput,
    sendResize,
  };
}

export default useExecSession;
