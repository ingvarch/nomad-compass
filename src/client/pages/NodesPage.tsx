import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { NomadNode } from '../types/nomad';
import {
  LoadingSpinner,
  ErrorAlert,
  PageHeader,
  RefreshButton,
  FilterButtons,
  BackLink,
  FilterOption,
} from '../components/ui';
import { getNodeStatusColor, getStatusClasses } from '../lib/utils/statusColors';
import { useFetch } from '../hooks/useFetch';

type StatusFilter = 'all' | 'ready' | 'down' | 'draining';

function formatResources(cpu: number, memoryMB: number): string {
  const memoryGB = (memoryMB / 1024).toFixed(1);
  return `${cpu} MHz / ${memoryGB} GB`;
}

export default function NodesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { data: nodes, loading, error, refetch } = useFetch(
    async () => {
      const client = createNomadClient();
      return client.getNodes();
    },
    [],
    { initialData: [], errorMessage: 'Failed to fetch nodes' }
  );

  const statusFilter = (searchParams.get('status') as StatusFilter) || 'all';

  const nodesList = useMemo(() => nodes || [], [nodes]);

  const filteredNodes = useMemo(() => nodesList.filter((node) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'draining') return node.Drain;
    if (statusFilter === 'ready') return node.Status === 'ready' && !node.Drain;
    if (statusFilter === 'down') return node.Status === 'down';
    return true;
  }), [nodesList, statusFilter]);

  const stats = useMemo(() => ({
    ready: nodesList.filter((n) => n.Status === 'ready' && !n.Drain).length,
    down: nodesList.filter((n) => n.Status === 'down').length,
    draining: nodesList.filter((n) => n.Drain).length,
  }), [nodesList]);

  const setFilter = (filter: string) => {
    if (filter === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', filter);
    }
    setSearchParams(searchParams);
  };

  const filterOptions: FilterOption[] = [
    { value: 'all', label: 'All', count: nodesList.length },
    { value: 'ready', label: 'Ready', count: stats.ready, color: 'bg-green-500' },
    { value: 'down', label: 'Down', count: stats.down, color: 'bg-red-500' },
    { value: 'draining', label: 'Draining', count: stats.draining, color: 'bg-yellow-500' },
  ];

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
          <RefreshButton onClick={refetch} />
        }
      />

      {error && <ErrorAlert message={error} />}

      {/* Status Filter */}
      <FilterButtons
        options={filterOptions}
        activeValue={statusFilter}
        onFilterChange={setFilter}
      />

      {/* Nodes Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {filteredNodes.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No nodes found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Eligibility</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Datacenter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Resources</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNodes.map((node) => {
                  const statusColors = getNodeStatusColor(node.Status, node.Drain);
                  return (
                    <tr
                      key={node.ID}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => navigate(`/nodes/${node.ID}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            {node.Name}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {node.ID.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClasses(statusColors)}`}>
                          {node.Drain ? 'draining' : node.Status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm ${
                          node.SchedulingEligibility === 'eligible'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {node.SchedulingEligibility}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {node.Datacenter || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {node.NodeResources ? (
                          formatResources(
                            node.NodeResources.Cpu.CpuShares,
                            node.NodeResources.Memory.MemoryMB
                          )
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {node.Version || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BackLink to="/dashboard" />
    </div>
  );
}
