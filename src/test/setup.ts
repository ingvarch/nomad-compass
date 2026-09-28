import { afterEach } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

// happy-dom replaces Bun's network APIs; server code under test needs the native ones.
const nativeApis = {
  fetch: globalThis.fetch,
  Headers: globalThis.Headers,
  Request: globalThis.Request,
  Response: globalThis.Response,
  WebSocket: globalThis.WebSocket,
  AbortController: globalThis.AbortController,
  AbortSignal: globalThis.AbortSignal,
};

GlobalRegistrator.register();
Object.assign(globalThis, nativeApis);

// Imported after register so Testing Library binds to the happy-dom document
// and registers its cleanup and act hooks for every test file.
await import('@testing-library/react');

afterEach(() => {
  // Undo mockFetch from src/test/mockFetch.ts
  globalThis.fetch = nativeApis.fetch;
});
