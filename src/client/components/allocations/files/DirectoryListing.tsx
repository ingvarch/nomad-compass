import { Link } from 'react-router-dom';
import { File, Folder } from 'lucide-react';
import { DataTable, type Column } from '../../ui';
import { childPath, filesPagePath } from '../../../lib/services/allocFilesService';
import { formatBytes } from '../../../lib/utils/formatBytes';
import { formatIsoDateLong } from '../../../lib/utils/dateFormatter';
import type { NomadAllocFileInfo } from '../../../types/nomad';

interface DirectoryListingProps {
  allocId: string;
  dir: string;
  entries: NomadAllocFileInfo[];
}

function EntryLink({ allocId, dir, entry }: { allocId: string; dir: string; entry: NomadAllocFileInfo }) {
  const Icon = entry.IsDir ? Folder : File;
  return (
    <Link
      to={filesPagePath(allocId, childPath(dir, entry.Name))}
      className="inline-flex items-center gap-2 font-mono text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 break-all"
    >
      <Icon aria-hidden="true" className={`w-4 h-4 shrink-0 ${entry.IsDir ? 'text-blue-500' : 'text-gray-400'}`} />
      {entry.Name}
    </Link>
  );
}

function sizeOf(entry: NomadAllocFileInfo): string {
  return entry.IsDir ? '-' : formatBytes(entry.Size);
}

export function DirectoryListing({ allocId, dir, entries }: DirectoryListingProps) {
  const columns: Column<NomadAllocFileInfo>[] = [
    { key: 'name', header: 'Name', render: (entry) => <EntryLink allocId={allocId} dir={dir} entry={entry} /> },
    {
      key: 'size',
      header: 'Size',
      textAlign: 'right',
      render: (entry) => <span className="text-sm text-gray-600 dark:text-gray-400">{sizeOf(entry)}</span>,
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (entry) => <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{entry.FileMode}</span>,
    },
    {
      key: 'modified',
      header: 'Modified',
      render: (entry) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatIsoDateLong(entry.ModTime)}</span>
      ),
    },
  ];

  return (
    <DataTable
      items={entries}
      columns={columns}
      keyExtractor={(entry) => entry.Name}
      emptyState={{ message: 'Empty directory.' }}
      mobileCardRenderer={(entry) => (
        <div className="p-4 space-y-1.5">
          <EntryLink allocId={allocId} dir={dir} entry={entry} />
          <div className="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-mono">{entry.FileMode}</span>
            <span>{sizeOf(entry)}</span>
          </div>
        </div>
      )}
    />
  );
}
