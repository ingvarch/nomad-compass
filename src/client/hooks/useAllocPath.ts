import { createNomadClient } from '../lib/api/nomad';
import { getPermissionErrorMessage, isPermissionError, PermissionError } from '../lib/errors';
import { FILE_PREVIEW_LIMIT, isRegularFile, sortEntries } from '../lib/services/allocFilesService';
import type { NomadAllocFileInfo } from '../types/nomad';
import { useFetch } from './useFetch';

export type AllocPathView =
  | { kind: 'dir'; entries: NomadAllocFileInfo[] }
  | { kind: 'file'; info: NomadAllocFileInfo; bytes: Uint8Array }
  // A pipe, socket or symlink: not read
  | { kind: 'special'; info: NomadAllocFileInfo };

/**
 * A directory listing or the start of a file in an allocation directory.
 */
export function useAllocPath(allocId: string, path: string) {
  return useFetch<AllocPathView>(
    async () => {
      const client = createNomadClient();
      try {
        // Nomad answers some failed reads with 200 and the error as content: stat first
        const info = await client.statAllocFile(allocId, path);
        if (info.IsDir) {
          return { kind: 'dir', entries: sortEntries((await client.listAllocFiles(allocId, path)) ?? []) };
        }
        if (!isRegularFile(info)) return { kind: 'special', info };
        return { kind: 'file', info, bytes: await client.readAllocFile(allocId, path, FILE_PREVIEW_LIMIT) };
      } catch (err) {
        if (isPermissionError(err)) throw new PermissionError(getPermissionErrorMessage('browse-files'));
        throw err;
      }
    },
    [allocId, path],
    { errorMessage: 'Failed to read the allocation directory' }
  );
}
