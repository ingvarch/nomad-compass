// src/client/lib/utils/nomadAddr.ts

export interface ParsedNomadAddr {
  isSecure: boolean;
  displayAddr: string;
}

export function parseNomadAddr(addr: string): ParsedNomadAddr {
  const isSecure = addr.startsWith('https://');
  const displayAddr = addr.replace(/^https?:\/\//, '');
  return { isSecure, displayAddr };
}
