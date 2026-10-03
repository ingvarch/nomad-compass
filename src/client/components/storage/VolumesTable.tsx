import { Link } from 'react-router-dom';
import { Badge, DataTable, type Column } from '../ui';
import { CSIHealthBadge } from './CSIHealthBadge';
import { csiHealth, pluginPath, volumePath } from '../../lib/services/csiService';
import type { NomadCSIVolumeListStub } from '../../types/csi';

const linkStyles = 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300';

function count(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function claims(volume: NomadCSIVolumeListStub): string {
  return `${count(volume.CurrentReaders, 'reader')}, ${count(volume.CurrentWriters, 'writer')}`;
}

// Nomad sets the mode of a volume from its claims
function mode(volume: NomadCSIVolumeListStub): string {
  return volume.AccessMode ? `${volume.AccessMode} (${volume.AttachmentMode})` : 'Not claimed';
}

function VolumeLink({ volume }: { volume: NomadCSIVolumeListStub }) {
  return (
    <Link to={volumePath(volume.ID, volume.Namespace)} className={`font-mono text-sm ${linkStyles}`}>
      {volume.ID}
    </Link>
  );
}

function PluginLink({ volume }: { volume: NomadCSIVolumeListStub }) {
  return (
    <Link to={pluginPath(volume.PluginID)} className={`text-sm ${linkStyles}`}>
      {volume.PluginID}
    </Link>
  );
}

const columns: Column<NomadCSIVolumeListStub>[] = [
  { key: 'id', header: 'Volume', render: (volume) => <VolumeLink volume={volume} /> },
  { key: 'namespace', header: 'Namespace', render: (volume) => <Badge variant="blue">{volume.Namespace}</Badge> },
  { key: 'plugin', header: 'Plugin', render: (volume) => <PluginLink volume={volume} /> },
  {
    key: 'mode',
    header: 'Access Mode',
    render: (volume) => <span className="text-sm text-gray-600 dark:text-gray-400">{mode(volume)}</span>,
  },
  {
    key: 'claims',
    header: 'Claims',
    render: (volume) => <span className="text-sm text-gray-600 dark:text-gray-400">{claims(volume)}</span>,
  },
  { key: 'health', header: 'Health', render: (volume) => <CSIHealthBadge health={csiHealth(volume)} /> },
];

export function VolumesTable({ volumes }: { volumes: NomadCSIVolumeListStub[] }) {
  return (
    <DataTable
      items={volumes}
      columns={columns}
      keyExtractor={(volume) => `${volume.Namespace}/${volume.ID}`}
      emptyState={{
        message: 'No CSI volumes. A volume shows up here once a CSI plugin runs and the volume is registered or created.',
      }}
      mobileCardRenderer={(volume) => (
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <VolumeLink volume={volume} />
            <CSIHealthBadge health={csiHealth(volume)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Badge variant="blue">{volume.Namespace}</Badge>
            <PluginLink volume={volume} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {mode(volume)} · {claims(volume)}
          </div>
        </div>
      )}
    />
  );
}
