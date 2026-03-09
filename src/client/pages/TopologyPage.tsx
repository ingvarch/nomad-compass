import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { getErrorMessage } from '../lib/errors';
import type { NomadNode, NomadAllocation } from '../types/nomad';
import { LoadingSpinner, ErrorAlert, PageHeader, RefreshButton, BackLink } from '../components/ui';

interface NodeWithAllocations extends NomadNode {
  allocations: NomadAllocation[];
  usedCpu: number;
  usedMemory: number;
}

type ViewMode = 'grid' | 'list';
type GroupBy = 'datacenter' | 'none';

export default function TopologyPage() {
  const [nodes, setNodes] = useState<NomadNode[]>([]);
  const [allocations, setAllocations] = useState<NomadAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [groupBy, setGroupBy] = useState<GroupBy>('datacenter');
  const [selectedDatacenter, setSelectedDatacenter] = useState<string>('all');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    const client = createNomadClient();

    try {
      const [nodesData, allocsData] = await Promise.all([
        client.getNodes(),
        client.getAllocations(),
      ]);

      setNodes(nodesData);
      setAllocations(allocsData);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch topology data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Process nodes with their allocations and resource usage
  const nodesWithAllocations = useMemo((): NodeWithAllocations[] => {
    return nodes.map((node) => {
      const nodeAllocs = allocations.filter(
        (a) => a.NodeID === node.ID && a.ClientStatus === 'running'
      );

      let usedCpu = 0;
      let usedMemory = 0;

      for (const alloc of nodeAllocs) {
        if (alloc.AllocatedResources?.Tasks) {
          for (const task of Object.values(alloc.AllocatedResources.Tasks)) {
            usedCpu += task.Cpu?.CpuShares || 0;
            usedMemory += task.Memory?.MemoryMB || 0;
          }
        }
      }

      return {
        ...node,
        allocations: nodeAllocs,
        usedCpu,
        usedMemory,
      };
    });
  }, [nodes, allocations]);

  // Get unique datacenters
  const datacenters = useMemo(() => {
    const dcs = new Set(nodes.map((n) => n.Datacenter || 'unknown'));
    return ['all', ...Array.from(dcs).sort()];
  }, [nodes]);

  // Filter and group nodes
  const groupedNodes = useMemo(() => {
    let filtered = nodesWithAllocations;

    if (selectedDatacenter !== 'all') {
      filtered = filtered.filter((n) => n.Datacenter === selectedDatacenter);
    }

    if (groupBy === 'datacenter') {
      const grouped = new Map<string, NodeWithAllocations[]>();
      for (const node of filtered) {
        const dc = node.Datacenter || 'unknown';
        const existing = grouped.get(dc) || [];
        grouped.set(dc, [...existing, node]);
      }
      return grouped;
    }

    return new Map([['All Nodes', filtered]]);
  }, [nodesWithAllocations, selectedDatacenter, groupBy]);

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cluster Topology" description="Visual overview of nodes and allocations" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cluster Topology"
        description="Visual overview of nodes and allocations"
        actions={
          <RefreshButton onClick={() => { setLoading(true); fetchData(); }} />
        }
      />

      {error && <ErrorAlert message={error} />}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        {/* Datacenter Filter */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Datacenter</label>
          <select
            value={selectedDatacenter}
            onChange={(e) => setSelectedDatacenter(e.target.value)}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            {datacenters.map((dc) => (
              <option key={dc} value={dc}>
                {dc === 'all' ? 'All Datacenters' : dc}
              </option>
            ))}
          </select>
        </div>

        {/* Group By */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Group By</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="datacenter">Datacenter</option>
            <option value="none">None</option>
          </select>
        </div>

        {/* View Mode */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${
              viewMode === 'grid'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="Grid view"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${
              viewMode === 'list'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="List view"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Topology View */}
      <div className="space-y-6">
        {Array.from(groupedNodes.entries()).map(([groupName, groupNodes]) => (
          <div
            key={groupName}
            className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
          >
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">{groupName}</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {groupNodes.length} node{groupNodes.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div
              className={
                viewMode === 'grid'
                  ? 'p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                  : 'divide-y divide-gray-200 dark:divide-gray-700'
              }
            >
              {groupNodes.map((node) => (
                <NodeCard
                  key={node.ID}
                  node={node}
                  viewMode={viewMode}
                  isExpanded={expandedNodes.has(node.ID)}
                  onToggleExpand={() => toggleNodeExpanded(node.ID)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <BackLink to="/dashboard" />
    </div>
  );
}

// Node Card Component
interface NodeCardProps {
  node: NodeWithAllocations;
  viewMode: ViewMode;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function NodeCard({ node, viewMode, isExpanded, onToggleExpand }: NodeCardProps) {
  const totalCpu = node.NodeResources?.Cpu?.CpuShares || 0;
  const totalMemory = node.NodeResources?.Memory?.MemoryMB || 0;
  const cpuPercent = totalCpu > 0 ? (node.usedCpu / totalCpu) * 100 : 0;
  const memoryPercent = totalMemory > 0 ? (node.usedMemory / totalMemory) * 100 : 0;

  const statusColor = node.Drain
    ? 'bg-yellow-500'
    : node.Status === 'ready'
      ? 'bg-green-500'
      : 'bg-red-500';

  // Group allocations by job
  const allocsByJob = useMemo(() => {
    const grouped = new Map<string, NomadAllocation[]>();
    for (const alloc of node.allocations) {
      const existing = grouped.get(alloc.JobID) || [];
      grouped.set(alloc.JobID, [...existing, alloc]);
    }
    return grouped;
  }, [node.allocations]);

  if (viewMode === 'list') {
    return (
      <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${statusColor}`} />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">{node.Name}</span>
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-mono">
                {node.ID.slice(0, 8)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {node.allocations.length} alloc{node.allocations.length !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-500 dark:text-gray-400">CPU: {cpuPercent.toFixed(0)}%</span>
            <span className="text-gray-500 dark:text-gray-400">
              Mem: {memoryPercent.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Node Header */}
      <button
        onClick={onToggleExpand}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${statusColor}`} />
            <span className="font-medium text-gray-900 dark:text-white">{node.Name}</span>
            {node.Drain && (
              <span className="text-xs px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 rounded">
                draining
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Resource Bars */}
      <div className="px-4 py-3 space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">CPU</span>
            <span className="text-gray-500 dark:text-gray-400">{cpuPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                cpuPercent > 80
                  ? 'bg-red-500'
                  : cpuPercent > 60
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(cpuPercent, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">Memory</span>
            <span className="text-gray-500 dark:text-gray-400">{memoryPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                memoryPercent > 80
                  ? 'bg-red-500'
                  : memoryPercent > 60
                    ? 'bg-yellow-500'
                    : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(memoryPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Allocations (Expanded) */}
      {isExpanded && node.allocations.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Allocations ({node.allocations.length})
          </h4>
          <div className="space-y-2">
            {Array.from(allocsByJob.entries()).map(([jobId, allocs]) => (
              <div key={jobId} className="flex items-center justify-between text-xs">
                <Link
                  to={`/jobs/${jobId}?namespace=${allocs[0].Namespace}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[60%]"
                >
                  {jobId}
                </Link>
                <span className="text-gray-500 dark:text-gray-400">
                  {allocs.length} instance{allocs.length !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isExpanded && node.allocations.length === 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
          No running allocations
        </div>
      )}
    </div>
  );
}
