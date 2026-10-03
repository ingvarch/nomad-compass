import { Link, useParams } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { withPermissionMessage } from '../lib/errors';
import { useFetch } from '../hooks/useFetch';
import { PageHeader, LoadingSpinner, ErrorAlert, Badge, DataTable, type Column } from '../components/ui';
import { CSIHealthBadge, controllersLabel, nodesLabel } from '../components/storage';
import { DetailSection } from '../components/storage/DetailSection';
import { csiHealth, pluginInstances, type PluginInstance } from '../lib/services/csiService';
import { formatIsoDateLong } from '../lib/utils/dateFormatter';
import type { NomadCSIControllerInfo, NomadCSIPlugin } from '../types/csi';

const FEATURES: [keyof NomadCSIControllerInfo, string][] = [
  ['SupportsCreateDelete', 'Create and delete volumes'],
  ['SupportsAttachDetach', 'Attach and detach'],
  ['SupportsListVolumes', 'List volumes'],
  ['SupportsCreateDeleteSnapshot', 'Snapshots'],
  ['SupportsExpand', 'Expand volumes'],
];

function controllerFeatures(plugin: NomadCSIPlugin): string[] {
  const infos = Object.values(plugin.Controllers ?? {}).map((controller) => controller.ControllerInfo);
  return FEATURES.filter(([key]) => infos.some((info) => info?.[key])).map(([, label]) => label);
}

const instanceColumns: Column<PluginInstance>[] = [
  { key: 'type', header: 'Type', render: ({ type }) => <span className="text-sm">{type}</span> },
  {
    key: 'node',
    header: 'Node',
    render: ({ nodeId }) => (
      <Link
        to={`/nodes/${encodeURIComponent(nodeId)}`}
        className="font-mono text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {nodeId.slice(0, 8)}
      </Link>
    ),
  },
  {
    key: 'health',
    header: 'Health',
    render: ({ info }) => <Badge variant={info.Healthy ? 'green' : 'red'}>{info.HealthDescription || (info.Healthy ? 'healthy' : 'unhealthy')}</Badge>,
  },
  {
    key: 'alloc',
    header: 'Allocation',
    render: ({ info }) => <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{info.AllocID.slice(0, 8)}</span>,
  },
  {
    key: 'updated',
    header: 'Updated',
    render: ({ info }) => <span className="text-sm text-gray-600 dark:text-gray-400">{formatIsoDateLong(info.UpdateTime)}</span>,
  },
];

/**
 * A CSI plugin: its provider, health and the controller and node plugins that run it.
 */
export default function CSIPluginPage() {
  const { pluginId = '' } = useParams<{ pluginId: string }>();
  const plugin = useFetch<NomadCSIPlugin>(
    () => withPermissionMessage('read-plugins', () => createNomadClient().getCSIPlugin(pluginId)),
    [pluginId],
    { errorMessage: 'Failed to load CSI plugin' }
  );

  if (plugin.loading && !plugin.data) return <LoadingSpinner />;
  if (plugin.error || !plugin.data) return <ErrorAlert message={plugin.error ?? 'Plugin not found'} />;

  const data = plugin.data;
  const features = controllerFeatures(data);
  const summary: [string, string][] = [
    ['Provider', `${data.Provider} ${data.Version}`.trim()],
    ['Controllers Healthy', controllersLabel(data)],
    ['Nodes Healthy', nodesLabel(data)],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={data.ID} description="CSI plugin" />

      <div className="flex items-center gap-2">
        <CSIHealthBadge health={csiHealth(data)} />
      </div>

      <dl className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        {summary.map(([label, value]) => (
          <div key={label}>
            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>

      {data.ControllerRequired && (
        <DetailSection title="Controller Features">
          <ul className="px-4 py-3 flex flex-wrap gap-2">
            {features.map((feature) => (
              <li key={feature}>
                <Badge variant="blue">{feature}</Badge>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      <DetailSection title="Instances">
        <DataTable
          items={pluginInstances(data)}
          columns={instanceColumns}
          keyExtractor={({ type, nodeId }) => `${type}/${nodeId}`}
          emptyState={{ message: 'No controller or node plugin runs.' }}
        />
      </DetailSection>
    </div>
  );
}
