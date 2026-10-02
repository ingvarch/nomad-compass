import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import type { NomadNode } from '../types/nomad';
import {
  LoadingSpinner,
  ErrorAlert,
  PageHeader,
  RefreshButton,
  Button,
  FilterButtons,
  BackLink,
  DataTable,
  Badge,
  type Column,
} from '../components/ui';
import { ChevronRight, Layers } from 'lucide-react';
import { getNodeStatusColor, getStatusClasses } from '../lib/utils/statusColors';
import { useFetch } from '../hooks/useFetch';
import { useFilteredData } from '../hooks/useFilteredData';

type StatusFilter = 'all' | 'ready' | 'down' | 'draining';

function formatResources(cpu: number, memoryMB: number): string {
  const memoryGB = (memoryMB / 1024).toFixed(1);
  return `${cpu} MHz / ${memoryGB} GB`;
}

export default function NodesPage() {
  const navigate = useNavigate();

  const { data: nodes, loading, error, refetch } = useFetch(
    async () => {
      const client = createNomadClient();
      return client.getNodes();
    },
    [],
    { initialData: [], errorMessage: 'Failed to fetch nodes' }
  );

  const nodesList = useMemo(() => nodes || [], [nodes]);

  const { activeFilter, filteredItems, filterOptions, setFilter } = useFilteredData<NomadNode, StatusFilter>(
    nodesList,
    {
      defaultValue: 'all',
      filters: [
        { value: 'all', label: 'All', predicate: () => true },
        { value: 'ready', label: 'Ready', predicate: (n) => n.Status === 'ready' && !n.Drain, color: 'bg-green-500' },
        { value: 'down', label: 'Down', predicate: (n) => n.Status === 'down', color: 'bg-red-500' },
        { value: 'draining', label: 'Draining', predicate: (n) => n.Drain, color: 'bg-yellow-500' },
      ],
    }
  );

  const columns: Column<NomadNode>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      render: (node) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {node.Name}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            {node.ID.slice(0, 8)}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (node) => {
        const statusColors = getNodeStatusColor(node.Status, node.Drain);
        return (
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClasses(statusColors)}`}>
            {node.Drain ? 'draining' : node.Status}
          </span>
        );
      },
    },
    {
      key: 'eligibility',
      header: 'Eligibility',
      render: (node) => (
        <span className={`text-sm ${
          node.SchedulingEligibility === 'eligible'
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          {node.SchedulingEligibility}
        </span>
      ),
    },
    {
      key: 'datacenter',
      header: 'Datacenter',
      render: (node) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {node.Datacenter || '-'}
        </span>
      ),
    },
    {
      key: 'nodePool',
      header: 'Node Pool',
      render: (node) => {
        const pool = node.NodePool || 'default';
        const isDefault = pool.toLowerCase() === 'default';
        return (
          <Badge variant={isDefault ? 'gray' : 'purple'} size="sm">
            {pool}
          </Badge>
        );
      },
    },
    {
      key: 'resources',
      header: 'Resources',
      render: (node) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {node.NodeResources
            ? formatResources(node.NodeResources.Cpu.CpuShares, node.NodeResources.Memory.MemoryMB)
            : '-'}
        </span>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      render: (node) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {node.Version || '-'}
        </span>
      ),
    },
  ], []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Nodes" description="View and manage cluster nodes" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nodes"
        description="View and manage cluster nodes"
        actions={
          <div className="flex items-center gap-2">
            <RefreshButton onClick={refetch} />
            <Link to="/node-pools">
              <Button variant="secondary" size="sm">
                <Layers className="w-4 h-4 mr-1.5" /> Node Pools
              </Button>
            </Link>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <FilterButtons
        options={filterOptions}
        activeValue={activeFilter}
        onFilterChange={setFilter}
      />

      <DataTable
        items={filteredItems}
        columns={columns}
        keyExtractor={(node) => node.ID}
        onRowClick={(node) => navigate(`/nodes/${node.ID}`)}
        emptyState={{ message: 'No nodes found.' }}
        mobileCardRenderer={(node) => {
          const statusColors = getNodeStatusColor(node.Status, node.Drain);
          return (
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-blue-600 dark:text-blue-400 truncate">
                    {node.Name}
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
                    {node.ID.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClasses(statusColors)}`}>
                    {node.Drain ? 'draining' : node.Status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <Badge variant="blue">{node.Datacenter || '-'}</Badge>
                <Badge variant={node.NodePool && node.NodePool !== 'default' ? 'purple' : 'gray'}>
                  {node.NodePool || 'default'}
                </Badge>
                {node.NodeResources && (
                  <span>{formatResources(node.NodeResources.Cpu.CpuShares, node.NodeResources.Memory.MemoryMB)}</span>
                )}
                <span className={`ml-auto font-medium ${
                  node.SchedulingEligibility === 'eligible'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500'
                }`}>
                  {node.SchedulingEligibility}
                </span>
              </div>
            </div>
          );
        }}
      />

      <BackLink to="/dashboard" />
    </div>
  );
}
