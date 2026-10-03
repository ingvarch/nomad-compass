import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AllocationFilesPage from './AllocationFilesPage';
import { mockFetch, type FetchCall } from '../../test/mockFetch';
import { getPermissionErrorMessage } from '../lib/errors';
import type { NomadAllocFileInfo } from '../types/nomad';

afterEach(() => {
  cleanup();
});

const allocation = {
  ID: 'alloc-1', Name: 'web.web[0]', JobID: 'web', Namespace: 'default', TaskGroup: 'web',
  NodeID: 'node-1', NodeName: 'node-alpha', ClientStatus: 'running',
};

function info(name: string, overrides: Partial<NomadAllocFileInfo> = {}): NomadAllocFileInfo {
  const isDir = overrides.IsDir ?? false;
  return {
    Name: name, IsDir: isDir, Size: 153, FileMode: isDir ? 'drwxrwxrwx' : '-rw-r--r--',
    ModTime: '2026-10-02T23:27:06Z', ContentType: '', ...overrides,
  };
}

const dirs: Record<string, NomadAllocFileInfo[]> = {
  '/': [info('server', { IsDir: true }), info('alloc', { IsDir: true })],
  '/server/local': [info('nginx.conf', { Size: 77 }), info('app.json'), info('data', { IsDir: true })],
};

const appJson = '{\n  "listen": ":8080"\n}\n';

interface Files {
  stat?: Record<string, NomadAllocFileInfo>;
  content?: Record<string, string>;
  fail?: { status: number; message: string };
}

// Serves the allocation and its files like Nomad: stat and ls as JSON, readat as raw bytes
function nomadFiles({ stat = {}, content = {}, fail }: Files = {}) {
  return mockFetch(({ url }: FetchCall) => {
    if (url.startsWith('/api/auth/validate')) return { body: { authenticated: true } };
    if (url.startsWith('/api/nomad/v1/allocation/alloc-1')) return { body: allocation };
    const { pathname, searchParams } = new URL(url, 'http://ovoo');
    const path = searchParams.get('path') ?? '/';
    if (fail) return { status: fail.status, body: { message: fail.message } };
    if (pathname.includes('/fs/stat/')) return { body: stat[path] ?? info(path.split('/').pop() || 'alloc-1', { IsDir: true }) };
    if (pathname.includes('/fs/ls/')) return { body: dirs[path] ?? [] };
    if (pathname.includes('/fs/readat/')) return { body: content[path] ?? '' };
    return undefined;
  });
}

function renderPage(path?: string) {
  const query = path ? `?path=${encodeURIComponent(path)}` : '';
  render(
    <MemoryRouter initialEntries={[`/allocations/alloc-1/files${query}`]}>
      <Routes>
        <Route path="/allocations/:allocId/files" element={<AllocationFilesPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function fsCalls(calls: FetchCall[], kind: string) {
  return calls.filter((c) => c.url.includes(`/fs/${kind}/`));
}

describe('AllocationFilesPage', () => {
  test('lists the allocation directory with links into each directory', async () => {
    nomadFiles();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Files' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'web' }).getAttribute('href')).toBe('/jobs/web?namespace=default');
    // Directories first, by name
    const names = (await screen.findAllByRole('link', { name: /^(alloc|server)$/ })).map((l) => l.textContent);
    expect(names.slice(0, 2)).toEqual(['alloc', 'server']);
    expect(screen.getAllByRole('link', { name: 'server' })[0].getAttribute('href')).toBe(
      '/allocations/alloc-1/files?path=%2Fserver'
    );
  });

  test('opens a directory and links back up through the breadcrumbs', async () => {
    nomadFiles();
    renderPage('/server/local');

    expect((await screen.findAllByRole('link', { name: 'app.json' }))[0].getAttribute('href')).toBe(
      '/allocations/alloc-1/files?path=%2Fserver%2Flocal%2Fapp.json'
    );
    expect(screen.getAllByText('153 B').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-rw-r--r--').length).toBeGreaterThan(0);

    const crumbs = screen.getByRole('navigation', { name: 'Path' });
    expect(crumbs.textContent).toBe('alloc-1/server/local');
    expect(screen.getByRole('link', { name: 'server' }).getAttribute('href')).toBe('/allocations/alloc-1/files?path=%2Fserver');
    expect(screen.getByRole('link', { name: 'alloc-1' }).getAttribute('href')).toBe('/allocations/alloc-1/files');
  });

  test('moves into a directory on a click', async () => {
    nomadFiles();
    renderPage();

    fireEvent.click((await screen.findAllByRole('link', { name: 'server' }))[0]);

    expect(await screen.findByRole('navigation', { name: 'Path' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Path' }).textContent).toBe('alloc-1/server');
  });

  test('shows a text file with highlighting and a download link', async () => {
    const calls = nomadFiles({
      stat: { '/server/local/app.json': info('app.json', { Size: appJson.length, ContentType: 'application/json' }) },
      content: { '/server/local/app.json': appJson },
    });
    renderPage('/server/local/app.json');

    const code = await screen.findByTestId('file-content');
    expect(code.textContent).toBe(appJson);
    expect(code.innerHTML).toContain('<span class="hljs-attr">');

    const download = screen.getByRole('link', { name: 'Download' });
    expect(download.getAttribute('href')).toBe('/api/nomad/v1/client/fs/cat/alloc-1?path=%2Fserver%2Flocal%2Fapp.json');
    expect(download.getAttribute('download')).toBe('app.json');

    expect(fsCalls(calls, 'readat').map((c) => c.url)).toEqual([
      '/api/nomad/v1/client/fs/readat/alloc-1?path=%2Fserver%2Flocal%2Fapp.json&offset=0&limit=524288',
    ]);
    expect(fsCalls(calls, 'ls')).toHaveLength(0);
  });

  test('highlights an nginx config named .conf', async () => {
    const conf = 'server {\n  listen 80;\n  location / {\n    proxy_pass http://api/;\n  }\n}\n';
    nomadFiles({
      stat: { '/nginx/local/default.conf': info('default.conf', { Size: conf.length }) },
      content: { '/nginx/local/default.conf': conf },
    });
    renderPage('/nginx/local/default.conf');

    const code = await screen.findByTestId('file-content');
    expect(code.textContent).toBe(conf);
    expect(code.innerHTML).toContain('<span class="hljs-attribute">listen</span>');
  });

  test('shows a file of an unknown type as plain text', async () => {
    nomadFiles({
      stat: { '/alloc/logs/server.stdout.0': info('server.stdout.0', { Size: 18 }) },
      content: { '/alloc/logs/server.stdout.0': 'request 1 served\n' },
    });
    renderPage('/alloc/logs/server.stdout.0');

    const code = await screen.findByTestId('file-content');
    expect(code.textContent).toBe('request 1 served\n');
    expect(code.innerHTML).not.toContain('hljs');
  });

  test('offers a binary file only as a download', async () => {
    nomadFiles({
      stat: { '/server/local/blob.bin': info('blob.bin', { Size: 3 }) },
      content: { '/server/local/blob.bin': 'a\u0000b' },
    });
    renderPage('/server/local/blob.bin');

    expect(await screen.findByText('Binary file. Download it to open it.')).toBeTruthy();
    expect(screen.queryByTestId('file-content')).toBeNull();
    expect(screen.getByRole('link', { name: 'Download' })).toBeTruthy();
  });

  test('says when it shows only the start of a large file', async () => {
    nomadFiles({
      stat: { '/alloc/logs/big.log': info('big.log', { Size: 2 * 1024 * 1024 }) },
      content: { '/alloc/logs/big.log': 'first line\n' },
    });
    renderPage('/alloc/logs/big.log');

    expect(await screen.findByText('Showing the first 512.0 KiB of 2.0 MiB. Download the file to see all of it.')).toBeTruthy();
  });

  // Reading a log pipe would never end
  test('does not read a file that is not a regular file', async () => {
    const calls = nomadFiles({
      stat: { '/alloc/logs/.server.stdout.fifo': info('.server.stdout.fifo', { FileMode: 'prw-------', Size: 0 }) },
    });
    renderPage('/alloc/logs/.server.stdout.fifo');

    expect(await screen.findByText('This is not a regular file (prw-------), so it cannot be shown.')).toBeTruthy();
    expect(fsCalls(calls, 'readat')).toHaveLength(0);
    expect(screen.queryByRole('link', { name: 'Download' })).toBeNull();
  });

  test('shows the error of Nomad and keeps the breadcrumbs', async () => {
    nomadFiles({ fail: { status: 500, message: 'Reading secret file prohibited: /server/secrets' } });
    renderPage('/server/secrets');

    expect(await screen.findByText('Reading secret file prohibited: /server/secrets')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'server' }).getAttribute('href')).toBe('/allocations/alloc-1/files?path=%2Fserver');
  });

  test('explains a permission error', async () => {
    nomadFiles({ fail: { status: 403, message: 'Permission denied' } });
    renderPage();

    expect(await screen.findByText(getPermissionErrorMessage('browse-files'))).toBeTruthy();
    expect(getPermissionErrorMessage('browse-files')).toContain('read-fs');
  });
});
