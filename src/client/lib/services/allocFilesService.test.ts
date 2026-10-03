import { describe, test, expect } from 'bun:test';
import {
  FILE_PREVIEW_LIMIT,
  childPath,
  isBinary,
  isRegularFile,
  languagesForFile,
  parentPath,
  pathCrumbs,
  sortEntries,
} from './allocFilesService';
import type { NomadAllocFileInfo } from '../../types/nomad';

function entry(name: string, isDir: boolean, mode = isDir ? 'drwxr-xr-x' : '-rw-r--r--'): NomadAllocFileInfo {
  return { Name: name, IsDir: isDir, Size: 1, FileMode: mode, ModTime: '2026-10-02T23:27:06Z', ContentType: '' };
}

describe('paths', () => {
  test('joins a directory and an entry name', () => {
    expect(childPath('/', 'alloc')).toBe('/alloc');
    expect(childPath('/server/local', 'app.json')).toBe('/server/local/app.json');
  });

  test('finds the parent directory', () => {
    expect(parentPath('/server/local/app.json')).toBe('/server/local');
    expect(parentPath('/alloc')).toBe('/');
    expect(parentPath('/')).toBe('/');
  });

  test('splits a path into breadcrumbs from the allocation root', () => {
    expect(pathCrumbs('/')).toEqual([]);
    expect(pathCrumbs('/server/local/app.json')).toEqual([
      { name: 'server', path: '/server' },
      { name: 'local', path: '/server/local' },
      { name: 'app.json', path: '/server/local/app.json' },
    ]);
  });
});

describe('sortEntries', () => {
  test('puts directories first, then sorts by name', () => {
    const sorted = sortEntries([entry('b.txt', false), entry('local', true), entry('a.txt', false), entry('alloc', true)]);

    expect(sorted.map((e) => e.Name)).toEqual(['alloc', 'local', 'a.txt', 'b.txt']);
  });
});

describe('isRegularFile', () => {
  // Nomad keeps the task log pipes in alloc/logs; reading one never ends
  test('is true only for a regular file', () => {
    expect(isRegularFile(entry('app.json', false))).toBe(true);
    expect(isRegularFile(entry('.server.stdout.fifo', false, 'prw-------'))).toBe(false);
    expect(isRegularFile(entry('local', true))).toBe(false);
    expect(isRegularFile(entry('current', false, 'Lrwxrwxrwx'))).toBe(false);
  });
});

describe('isBinary', () => {
  test('is true when the bytes hold a NUL', () => {
    expect(isBinary(new Uint8Array([0x7b, 0x00, 0x7d]))).toBe(true);
    expect(isBinary(new TextEncoder().encode('{"ключ": "значение"}'))).toBe(false);
  });
});

describe('languagesForFile', () => {
  test('picks the highlighting language by extension', () => {
    expect(languagesForFile('app.json')).toEqual(['json']);
    expect(languagesForFile('values.YAML')).toEqual(['yaml']);
    expect(languagesForFile('compose.yml')).toEqual(['yaml']);
    expect(languagesForFile('config.toml')).toEqual(['ini']);
    expect(languagesForFile('settings.ini')).toEqual(['ini']);
    expect(languagesForFile('entrypoint.sh')).toEqual(['bash']);
    expect(languagesForFile('app.env')).toEqual(['bash']);
    expect(languagesForFile('index.html')).toEqual(['xml']);
    expect(languagesForFile('app.properties')).toEqual(['properties']);
  });

  // A .conf file is an nginx config as often as an INI file: the content decides
  test('offers candidates for an extension several formats use', () => {
    expect(languagesForFile('default.conf')).toEqual(['nginx', 'ini']);
    expect(languagesForFile('haproxy.cfg')).toEqual(['nginx', 'ini']);
  });

  test('is empty for an unknown extension or a file without one', () => {
    expect(languagesForFile('server.stdout.0')).toEqual([]);
    expect(languagesForFile('Makefile')).toEqual([]);
  });
});

test('previews at most 512 KiB', () => {
  expect(FILE_PREVIEW_LIMIT).toBe(512 * 1024);
});
