import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Camera, Trash2 } from 'lucide-react';
import { createNomadClient } from '../lib/api/nomad';
import { getErrorMessage, withPermissionMessage } from '../lib/errors';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { DEFAULT_NAMESPACE } from '../lib/constants';
import {
  PageHeader,
  LoadingSpinner,
  ErrorAlert,
  Badge,
  Button,
  ConfirmationDialog,
  DataTable,
  type Column,
} from '../components/ui';
import { AllocationStatusBadge } from '../components/allocations';
import { CSIHealthBadge, controllersLabel, nodesLabel } from '../components/storage';
import { DetailSection, KeyValueList } from '../components/storage/DetailSection';
import { SnapshotModal } from '../components/storage/SnapshotModal';
import { csiHealth, pluginPath, supportsSnapshots, volumeClaims, type VolumeClaim } from '../lib/services/csiService';
import { formatBytes } from '../lib/utils/formatBytes';
import { jobPath } from '../lib/utils/jobPath';
import { checkboxStyles } from '../lib/styles';
import type { NomadCSIPlugin, NomadCSIVolume } from '../types/csi';

const linkStyles = 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300';

function Summary({ volume }: { volume: NomadCSIVolume }) {
  const items: [string, React.ReactNode][] = [
    ['Plugin', <Link key="plugin" to={pluginPath(volume.PluginID)} className={linkStyles}>{volume.PluginID}</Link>],
    ['Provider', `${volume.Provider} ${volume.ProviderVersion}`.trim()],
    ['External ID', <span key="external" className="font-mono break-all">{volume.ExternalID}</span>],
    ['Capacity', volume.Capacity > 0 ? formatBytes(volume.Capacity) : 'Unknown'],
    ['Controllers Healthy', controllersLabel(volume)],
    ['Nodes Healthy', nodesLabel(volume)],
  ];
  return (
    <dl className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
          <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const claimColumns: Column<VolumeClaim>[] = [
  {
    key: 'alloc',
    header: 'Allocation',
    render: ({ allocation }) => <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{allocation.ID.slice(0, 8)}</span>,
  },
  {
    key: 'job',
    header: 'Job',
    render: ({ allocation }) => (
      <Link to={jobPath(allocation.JobID, allocation.Namespace)} className={`text-sm ${linkStyles}`}>
        {allocation.JobID}
      </Link>
    ),
  },
  { key: 'group', header: 'Task Group', render: ({ allocation }) => <span className="text-sm">{allocation.TaskGroup}</span> },
  { key: 'claim', header: 'Claim', render: ({ mode }) => <Badge variant={mode === 'write' ? 'purple' : 'gray'}>{mode}</Badge> },
  { key: 'status', header: 'Status', render: ({ allocation }) => <AllocationStatusBadge allocation={allocation} /> },
  {
    key: 'node',
    header: 'Node',
    render: ({ allocation }) => <span className="text-sm">{allocation.NodeName || allocation.NodeID.slice(0, 8)}</span>,
  },
];

function VolumeDetails({ volume }: { volume: NomadCSIVolume }) {
  const segments = (volume.Topologies ?? [])
    .filter((topology) => topology !== null)
    .flatMap((topology) => Object.entries(topology!.Segments));

  return (
    <>
      <Summary volume={volume} />

      <div className="grid gap-6 md:grid-cols-2">
        <DetailSection title="Capabilities">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {(volume.RequestedCapabilities ?? []).map(({ AccessMode, AttachmentMode }) => (
              <li key={`${AccessMode}-${AttachmentMode}`} className="px-4 py-2.5 flex flex-wrap gap-x-3 text-sm font-mono">
                <span className="text-gray-900 dark:text-gray-100">{AccessMode}</span>
                <span className="text-gray-500 dark:text-gray-400">{AttachmentMode}</span>
              </li>
            ))}
          </ul>
        </DetailSection>

        <DetailSection title="Mount Options">
          <KeyValueList
            values={[
              ['File system', volume.MountOptions?.FSType || 'Default of the plugin'],
              ['Mount flags', (volume.MountOptions?.MountFlags ?? []).join(', ') || 'None'],
            ]}
            empty=""
          />
        </DetailSection>

        <DetailSection title="Topology">
          {segments.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">The volume is not limited to some nodes.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {segments.map(([key, value]) => (
                <li key={`${key}=${value}`} className="px-4 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                  {`${key} = ${value}`}
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection title="Parameters">
          <KeyValueList values={Object.entries(volume.Parameters ?? {})} empty="No parameters." />
        </DetailSection>
      </div>

      <DetailSection title="Allocations">
        <DataTable
          items={volumeClaims(volume)}
          columns={claimColumns}
          keyExtractor={({ allocation }) => allocation.ID}
          emptyState={{ message: 'No allocation uses this volume.' }}
          mobileCardRenderer={({ allocation, mode }) => (
            <div className="p-4 space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <Link to={jobPath(allocation.JobID, allocation.Namespace)} className={linkStyles}>
                  {allocation.JobID}
                </Link>
                <AllocationStatusBadge allocation={allocation} />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-mono">{allocation.ID.slice(0, 8)}</span>
                <Badge variant={mode === 'write' ? 'purple' : 'gray'}>{mode}</Badge>
                <span>{allocation.NodeName}</span>
              </div>
            </div>
          )}
        />
      </DetailSection>
    </>
  );
}

/**
 * A CSI volume: plugin, capacity, capabilities, mount options, topology and the allocations that use it.
 */
export default function CSIVolumePage() {
  const { volumeId = '' } = useParams<{ volumeId: string }>();
  const [searchParams] = useSearchParams();
  const namespace = searchParams.get('namespace') || DEFAULT_NAMESPACE;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [isDeregisterOpen, setIsDeregisterOpen] = useState(false);
  const [force, setForce] = useState(false);
  const [isDeregistering, setIsDeregistering] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  const volume = useFetch<NomadCSIVolume>(
    () => withPermissionMessage('read-volume', () => createNomadClient().getCSIVolume(volumeId, namespace)),
    [volumeId, namespace],
    { errorMessage: 'Failed to load CSI volume' }
  );
  const pluginId = volume.data?.PluginID;
  // Only to know whether the plugin can snapshot; without it the page just has no Snapshot button
  const plugin = useFetch<NomadCSIPlugin | null>(
    () => (pluginId ? createNomadClient().getCSIPlugin(pluginId) : Promise.resolve(null)),
    [pluginId]
  );

  const handleDeregister = async () => {
    setIsDeregistering(true);
    try {
      await createNomadClient().deregisterCSIVolume(volumeId, namespace, force);
      addToast(`Volume "${volumeId}" deregistered`, 'success');
      navigate('/storage');
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to deregister volume', 'deregister-volume'), 'error');
      setIsDeregistering(false);
      setIsDeregisterOpen(false);
    }
  };

  if (volume.loading && !volume.data) return <LoadingSpinner />;
  if (volume.error || !volume.data) return <ErrorAlert message={volume.error ?? 'Volume not found'} />;

  const data = volume.data;
  const canSnapshot = plugin.data ? supportsSnapshots(plugin.data) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.Name}
        description={data.Name === data.ID ? 'CSI volume' : `CSI volume ${data.ID}`}
        actions={
          <>
            {canSnapshot && (
              <Button variant="secondary" className="shadow-sm" onClick={() => setIsSnapshotOpen(true)}>
                <Camera className="w-4 h-4 mr-1.5" />
                Snapshot
              </Button>
            )}
            <Button variant="danger" className="shadow-sm" onClick={() => setIsDeregisterOpen(true)}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              Deregister
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="blue">Namespace: {data.Namespace}</Badge>
        <CSIHealthBadge health={csiHealth(data)} />
      </div>

      <VolumeDetails volume={data} />

      {isDeregisterOpen && (
        <ConfirmationDialog
          isOpen
          onClose={() => setIsDeregisterOpen(false)}
          onConfirm={handleDeregister}
          title="Deregister Volume"
          mode="delete"
          confirmLabel="Deregister"
          isLoading={isDeregistering}
          message={
            <div className="space-y-3">
              <p>
                Deregister <span className="font-mono">{data.ID}</span> from Nomad? The storage provider keeps the volume.
              </p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className={checkboxStyles}
                />
                <span>
                  Force: drop the claims of finished allocations now. Nomad still refuses while a running
                  allocation uses the volume.
                </span>
              </label>
            </div>
          }
        />
      )}

      {isSnapshotOpen && (
        <SnapshotModal
          volumeId={data.ID}
          onClose={() => setIsSnapshotOpen(false)}
          onSnapshot={(name) => createNomadClient().createCSISnapshot(data, name)}
        />
      )}
    </div>
  );
}
