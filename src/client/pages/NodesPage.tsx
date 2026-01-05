import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { NomadNode } from '../types/nomad';

type StatusFilter = 'all' | 'ready' | 'down' | 'draining';

function formatResources(cpu: number, memoryMB: number): string {
  const memoryGB = (memoryMB / 1024).toFixed(1);
  return `${cpu} MHz / ${memoryGB} GB`;
}

export default function NodesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [nodes, setNodes] = useState<NomadNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as StatusFilter) || 'all';

  const fetchData = useCallback(async () => {
    const client = createNomadClient();

    try {
      const nodesData = await client.getNodes();
      setNodes(nodesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredNodes = nodes.filter((node) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'draining') return node.Drain;
    if (statusFilter === 'ready') return node.Status === 'ready' && !node.Drain;
    if (statusFilter === 'down') return node.Status === 'down';
    return true;
  });

  const stats = {
    ready: nodes.filter((n) => n.Status === 'ready' && !n.Drain).length,
    down: nodes.filter((n) => n.Status === 'down').length,
    draining: nodes.filter((n) => n.Drain).length,
  };

  const setFilter = (filter: StatusFilter) => {
    if (filter === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', filter);
    }
    setSearchParams(searchParams);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Nodes</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and manage cluster nodes
          </p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Nodes</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and manage cluster nodes
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'All', count: nodes.length },
          { value: 'ready', label: 'Ready', count: stats.ready, color: 'bg-green-500' },
          { value: 'down', label: 'Down', count: stats.down, color: 'bg-red-500' },
          { value: 'draining', label: 'Draining', count: stats.draining, color: 'bg-yellow-500' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilter(filter.value as StatusFilter)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              statusFilter === filter.value
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {filter.color && <span className={`w-2 h-2 rounded-full ${filter.color}`} />}
            {filter.label}
            <span className="text-gray-500 dark:text-gray-400">({filter.count})</span>
          </button>
        ))}
      </div>

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
                {filteredNodes.map((node) => (
                  <tr key={node.ID} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {node.Name}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                          {node.ID.slice(0, 8)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {node.Drain ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200">
                            draining
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            node.Status === 'ready'
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                          }`}>
                            {node.Status}
                          </span>
                        )}
                      </div>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Link
        to="/dashboard"
        className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>
    </div>
  );
}
