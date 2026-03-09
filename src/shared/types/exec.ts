/**
 * Shared types for Nomad exec WebSocket protocol.
 * Used by both API handlers and client hooks.
 */

export interface ExecParams {
  allocId: string;
  task: string;
  command: string[];
  tty: boolean;
}

export interface ExecMessage {
  // Client to Server (to Nomad)
  stdin?: { data?: string; close?: boolean };
  tty_size?: { height: number; width: number };

  // Server to Client (from Nomad)
  stdout?: { data: string };
  stderr?: { data: string };
  exited?: boolean;
  result?: { exit_code: number };
}
