import type { NomadAllocFileInfo } from '../../types/nomad';

// A preview larger than this would make the page slow; the full file is a download
export const FILE_PREVIEW_LIMIT = 512 * 1024;

export interface PathCrumb {
  name: string;
  path: string;
}

/**
 * Page that shows a path of an allocation directory; the root needs no query.
 */
export function filesPagePath(allocId: string, path: string): string {
  const base = `/allocations/${encodeURIComponent(allocId)}/files`;
  return path === '/' ? base : `${base}?path=${encodeURIComponent(path)}`;
}

/**
 * Paths start at the allocation directory root "/".
 */
export function childPath(dir: string, name: string): string {
  return dir === '/' ? `/${name}` : `${dir}/${name}`;
}

export function parentPath(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut <= 0 ? '/' : path.slice(0, cut);
}

export function pathCrumbs(path: string): PathCrumb[] {
  const names = path.split('/').filter(Boolean);
  return names.map((name, i) => ({ name, path: `/${names.slice(0, i + 1).join('/')}` }));
}

export function sortEntries(entries: NomadAllocFileInfo[]): NomadAllocFileInfo[] {
  return [...entries].sort((a, b) => {
    if (a.IsDir !== b.IsDir) return a.IsDir ? -1 : 1;
    return a.Name.localeCompare(b.Name);
  });
}

/**
 * Only a regular file can be read: a pipe like the task log fifos would never end.
 */
export function isRegularFile(info: NomadAllocFileInfo): boolean {
  return !info.IsDir && info.FileMode.startsWith('-');
}

export function isBinary(bytes: Uint8Array): boolean {
  return bytes.includes(0);
}

// Several formats share .conf and .cfg, so the content picks one of the candidates
const CONFIG_LANGUAGES = ['nginx', 'ini'];

const LANGUAGES: Record<string, string[]> = {
  json: ['json'],
  yaml: ['yaml'],
  yml: ['yaml'],
  toml: ['ini'],
  ini: ['ini'],
  conf: CONFIG_LANGUAGES,
  cfg: CONFIG_LANGUAGES,
  sh: ['bash'],
  bash: ['bash'],
  env: ['bash'],
  xml: ['xml'],
  html: ['xml'],
  htm: ['xml'],
  properties: ['properties'],
};

/**
 * Highlighting languages that may fit a file by its extension; empty for plain text.
 */
export function languagesForFile(name: string): string[] {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot <= 0) return [];
  return LANGUAGES[lower.slice(dot + 1)] ?? [];
}
