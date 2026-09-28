import { describe, test, expect, afterEach } from 'bun:test';
import type { Server } from 'bun';
import { createBunWebSocketHandlers } from './bunWebSocket';

interface UpstreamRequest {
  url: URL;
  token: string | null;
}

// Fake Nomad that records the exec upgrade request
function startFakeNomad() {
  let resolveRequest: (req: UpstreamRequest) => void;
  const received = new Promise<UpstreamRequest>((resolve) => {
    resolveRequest = resolve;
  });

  const server = Bun.serve({
    port: 0,
    fetch(req, srv) {
      resolveRequest({ url: new URL(req.url), token: req.headers.get('X-Nomad-Token') });
      if (srv.upgrade(req)) return undefined;
      return new Response('upgrade failed', { status: 400 });
    },
    websocket: { message() {} },
  });

  return { server, received };
}

function fakeBrowserSocket(nomadAddr: string, token: string) {
  return {
    data: {
      params: { allocId: 'alloc-1', task: 'web', command: ['/bin/sh'], tty: true },
      token,
      nomadAddr,
    },
    readyState: WebSocket.OPEN,
    send() {},
    close() {},
  } as unknown as WebSocket;
}

describe('Bun exec WebSocket relay', () => {
  let nomad: Server<unknown> | undefined;

  afterEach(() => {
    nomad?.stop(true);
    nomad = undefined;
  });

  test('sends the Nomad token in a header, never in the URL', async () => {
    const fake = startFakeNomad();
    nomad = fake.server;
    const nomadAddr = `http://localhost:${fake.server.port}`;
    const { websocket } = createBunWebSocketHandlers({ nomadAddr, ticketSecret: 'test-secret' });
    const browserWs = fakeBrowserSocket(nomadAddr, 'secret-nomad-token');

    await websocket.open(browserWs);
    const upstream = await fake.received;
    websocket.close(browserWs);

    expect(upstream.token).toBe('secret-nomad-token');
    expect(upstream.url.href).not.toContain('secret-nomad-token');
    expect(upstream.url.pathname).toBe('/v1/client/allocation/alloc-1/exec');
    expect(upstream.url.searchParams.get('task')).toBe('web');
  });
});
