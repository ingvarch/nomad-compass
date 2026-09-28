export interface FetchCall {
  url: string;
  method: string;
  body: unknown;
}

interface MockReply {
  status?: number;
  body?: unknown;
}

/**
 * Replaces global fetch until the end of the test (src/test/setup.ts restores it).
 * `respond` returns the reply for a call; no reply means 200 with `{}`.
 * A string body is sent as text/plain, anything else as JSON.
 * Records string URLs and JSON string bodies only.
 */
export function mockFetch(respond: (call: FetchCall) => MockReply | undefined = () => undefined): FetchCall[] {
  const calls: FetchCall[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: FetchCall = {
      url: String(input),
      method: (init?.method || 'GET').toUpperCase(),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);

    const reply = respond(call) ?? {};
    const isText = typeof reply.body === 'string';
    return new Response(isText ? (reply.body as string) : JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': isText ? 'text/plain' : 'application/json' },
    });
  }) as unknown as typeof fetch;

  return calls;
}
