import { Link } from 'react-router-dom';
import { DataTable, type Column } from '../ui';
import { CSIHealthBadge } from './CSIHealthBadge';
import { csiHealth, pluginPath } from '../../lib/services/csiService';
import type { NomadCSIPluginListStub } from '../../types/csi';

function PluginLink({ plugin }: { plugin: NomadCSIPluginListStub }) {
  return (
    <Link
      to={pluginPath(plugin.ID)}
      className="font-mono text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {plugin.ID}
    </Link>
  );
}

// Healthy of expected; a plugin without controllers needs none
export function controllersLabel(plugin: NomadCSIPluginListStub): string {
  return plugin.ControllerRequired ? `${plugin.ControllersHealthy} / ${plugin.ControllersExpected}` : 'Not required';
}

export function nodesLabel(plugin: NomadCSIPluginListStub): string {
  return `${plugin.NodesHealthy} / ${plugin.NodesExpected}`;
}

const cell = (text: string) => <span className="text-sm text-gray-600 dark:text-gray-400">{text}</span>;

const columns: Column<NomadCSIPluginListStub>[] = [
  { key: 'id', header: 'Plugin', render: (plugin) => <PluginLink plugin={plugin} /> },
  { key: 'provider', header: 'Provider', render: (plugin) => cell(plugin.Provider) },
  { key: 'controllers', header: 'Controllers Healthy', render: (plugin) => cell(controllersLabel(plugin)) },
  { key: 'nodes', header: 'Nodes Healthy', render: (plugin) => cell(nodesLabel(plugin)) },
  { key: 'health', header: 'Health', render: (plugin) => <CSIHealthBadge health={csiHealth(plugin)} /> },
];

export function PluginsTable({ plugins }: { plugins: NomadCSIPluginListStub[] }) {
  return (
    <DataTable
      items={plugins}
      columns={columns}
      keyExtractor={(plugin) => plugin.ID}
      emptyState={{ message: 'No CSI plugins. A plugin shows up here once a job with a csi_plugin block runs.' }}
      mobileCardRenderer={(plugin) => (
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <PluginLink plugin={plugin} />
            <CSIHealthBadge health={csiHealth(plugin)} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {plugin.Provider} · Controllers {controllersLabel(plugin)} · Nodes {nodesLabel(plugin)}
          </div>
        </div>
      )}
    />
  );
}
