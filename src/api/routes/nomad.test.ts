import { describe, test, expect } from 'bun:test';
import { Hono } from 'hono';
import { nomadRoutes } from './nomad';
import type { Env } from '../types';
import { mockFetch } from '../../test/mockFetch';

const env: Env = { NOMAD_ADDR: 'http://nomad.test:4646' };
const app = new Hono<{ Bindings: Env }>();
app.route('/api/nomad', nomadRoutes);

function proxy(path: string) {
  return app.request(path, {}, env);
}

describe('Nomad proxy', () => {
  test('passes the message of a plain-text Nomad error', async () => {
    mockFetch(() => ({
      status: 500,
      body: '1 error occurred:\n\t* Invalid cron spec "not a cron": missing field(s)\n\n',
    }));

    const res = await proxy('/api/nomad/v1/job/backup/plan');

    expect(res.status).toBe(500);
    expect((await res.json()).message).toBe('Invalid cron spec "not a cron": missing field(s)');
  });

  test('hides an HTML error page of a proxy in front of Nomad', async () => {
    // mockFetch sends strings as text/plain; setup.ts restores fetch after the test
    globalThis.fetch = (async () =>
      new Response('<html><head><title>502 Bad Gateway</title></head></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      })) as unknown as typeof fetch;

    const res = await proxy('/api/nomad/v1/jobs');

    expect(res.status).toBe(502);
    expect((await res.json()).message).toBe('An error occurred while processing your request');
  });
});
