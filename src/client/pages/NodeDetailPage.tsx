import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { NomadNodeDetail, NomadAllocation } from '../types/nomad';
import { LoadingSpinner, ErrorAlert, BackLink, RefreshButton } from '../components/ui';
import { NodeAttributes } from '../components/nodes/NodeAttributes';
import { NodeAllocations } from '../components/nodes/NodeAllocations';

type TabType = 'overview' | 'allocations' | 'events';

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'ready':
      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' };
    case 'down':
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' };
    case 'initializing':
      return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' };
  }
}

function getEligibilityColor(eligibility: string): { bg: string; text: string } {
  switch (eligibility) {
    case 'eligible':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' };
    case 'ineligible':
      return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' };
  }
}

export default function NodeDetailPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const [node, setNode] = useState<NomadNodeDetail | null>(null);
  const [allocations, setAllocations] = useState<NomadAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const fetchNodeData = useCallback(async () => {
    if (!nodeId) return;

    setLoading(true);
    try {
      const client = createNomadClient();
      const [nodeData, allocData] = await Promise.all([
        client.getNode(nodeId),
        client.getNodeAllocations(nodeId),
      ]);
      setNode(nodeData);
      setAllocations(allocData || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch node details');
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchNodeData();
  }, [fetchNodeData]);

  if (loading) {
    return (
      <div className="py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4">
        <BackLink to="/nodes" label="Back to Nodes" />
        <ErrorAlert message={error} className="mt-4" />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="py-4">
        <BackLink to="/nodes" label="Back to Nodes" />
        <ErrorAlert message="Node not found" className="mt-4" />
      </div>
    );
  }

  const statusColors = getStatusColor(node.Status);
  const eligibilityColors = getEligibilityColor(node.SchedulingEligibility);
  const runningAllocs = allocations.filter(a => a.ClientStatus === 'running').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <BackLink to="/nodes" label="Back to Nodes" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {node.Name}
              </h1>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}>
                {node.Status}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${eligibilityColors.bg} ${eligibilityColors.text}`}>
                {node.SchedulingEligibility}
              </span>
              {node.Drain && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                  draining
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-mono">
              {node.ID}
            </p>
          </div>
          <RefreshButton onClick={fetchNodeData} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Datacenter</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {node.Datacenter || '-'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Node Class</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {node.NodeClass || 'default'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Version</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {node.Version || '-'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Running Allocations</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {runningAllocs}
          </div>
        </div>
      </div>

      {/* Resource Utilization */}
      {node.NodeResources && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">CPU</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {node.NodeResources.Cpu.CpuShares} MHz
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
              {node.ReservedResources?.Cpu && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {node.ReservedResources.Cpu.CpuShares} MHz reserved
                </div>
              )}
            </div>

            {/* Memory */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">Memory</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {Math.round(node.NodeResources.Memory.MemoryMB / 1024 * 10) / 10} GB
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
              {node.ReservedResources?.Memory && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {node.ReservedResources.Memory.MemoryMB} MB reserved
                </div>
              )}
            </div>

            {/* Disk */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">Disk</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {Math.round(node.NodeResources.Disk.DiskMB / 1024 * 10) / 10} GB
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
              {node.ReservedResources?.Disk && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {node.ReservedResources.Disk.DiskMB} MB reserved
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {(['overview', 'allocations', 'events'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab}
                {tab === 'allocations' && ` (${allocations.length})`}
                {tab === 'events' && node.Events && ` (${node.Events.length})`}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <NodeAttributes node={node} />}
          {activeTab === 'allocations' && <NodeAllocations allocations={allocations} />}
          {activeTab === 'events' && (
            <div className="space-y-4">
              {node.Events && node.Events.length > 0 ? (
                <div className="space-y-2">
                  {node.Events.slice().reverse().map((event, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[160px]">
                        {new Date(event.Timestamp).toLocaleString()}
                      </div>
                      <div className="flex-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 mr-2">
                          {event.Subsystem}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {event.Message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No events recorded
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
