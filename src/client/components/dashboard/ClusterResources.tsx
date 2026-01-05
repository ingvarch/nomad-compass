import { useMemo } from 'react';
import { NomadNode, NomadAllocation } from '../../types/nomad';

interface ClusterResourcesProps {
  nodes: NomadNode[];
  allocations: NomadAllocation[];
  loading?: boolean;
}

interface NamespaceUsage {
  cpu: number;
  memory: number;
}

interface ResourceBarProps {
  label: string;
  used: number;
  total: number;
  unit: string;
  color: string;
}

function ResourceBar({ label, used, total, unit, color }: ResourceBarProps) {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const percentageColor =
    percentage > 90 ? 'text-red-600 dark:text-red-400' : percentage > 70 ? 'text-yellow-600 dark:text-yellow-400' : '';

  const formatValue = (value: number, unit: string) => {
    if (unit === 'MB') {
      if (value >= 1024) {
        return `${(value / 1024).toFixed(1)} GB`;
      }
      return `${value} MB`;
    }
    if (unit === 'MHz') {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)} GHz`;
      }
      return `${value} MHz`;
    }
    return `${value} ${unit}`;
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`${percentageColor}`}>
          {formatValue(used, unit)} / {formatValue(total, unit)} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function calculateClusterResources(nodes: NomadNode[], allocations: NomadAllocation[]) {
  let totalCpu = 0;
  let totalMemory = 0;
  let totalDisk = 0;
  let usedCpu = 0;
  let usedMemory = 0;
  let usedDisk = 0;
  const byNamespace = new Map<string, NamespaceUsage>();

  // Calculate total resources from ready nodes
  nodes.forEach((node) => {
    if (node.Status === 'ready' && node.NodeResources) {
      totalCpu += node.NodeResources.Cpu?.CpuShares || 0;
      totalMemory += node.NodeResources.Memory?.MemoryMB || 0;
      totalDisk += node.NodeResources.Disk?.DiskMB || 0;
    }
  });

  // Calculate used resources from running allocations
  allocations
    .filter((alloc) => alloc.ClientStatus === 'running')
    .forEach((alloc) => {
      let allocCpu = 0;
      let allocMemory = 0;

      // Sum resources from all tasks in the allocation
      if (alloc.AllocatedResources?.Tasks) {
        Object.values(alloc.AllocatedResources.Tasks).forEach((task) => {
          allocCpu += task.Cpu?.CpuShares || 0;
          allocMemory += task.Memory?.MemoryMB || 0;
        });
      }

      usedCpu += allocCpu;
      usedMemory += allocMemory;
      usedDisk += alloc.AllocatedResources?.Shared?.DiskMB || 0;

      // Track by namespace
      const ns = alloc.Namespace;
      const existing = byNamespace.get(ns) || { cpu: 0, memory: 0 };
      byNamespace.set(ns, {
        cpu: existing.cpu + allocCpu,
        memory: existing.memory + allocMemory,
      });
    });

  return { totalCpu, usedCpu, totalMemory, usedMemory, totalDisk, usedDisk, byNamespace };
}

function formatValue(value: number, unit: 'MHz' | 'MB'): string {
  if (unit === 'MB' && value >= 1024) {
    return `${(value / 1024).toFixed(1)} GB`;
  }
  if (unit === 'MHz' && value >= 1000) {
    return `${(value / 1000).toFixed(1)} GHz`;
  }
  return `${value} ${unit}`;
}

export function ClusterResources({ nodes, allocations, loading }: ClusterResourcesProps) {
  const resources = useMemo(
    () => calculateClusterResources(nodes, allocations),
    [nodes, allocations]
  );

  const topNamespaces = useMemo(() => {
    return Array.from(resources.byNamespace.entries())
      .sort((a, b) => b[1].cpu - a[1].cpu)
      .slice(0, 3);
  }, [resources.byNamespace]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
        <div className="space-y-4">
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  const readyNodes = nodes.filter((n) => n.Status === 'ready').length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cluster Resources</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">{readyNodes} ready nodes</span>
      </div>
      <div className="space-y-4">
        <ResourceBar
          label="CPU"
          used={resources.usedCpu}
          total={resources.totalCpu}
          unit="MHz"
          color="bg-blue-500"
        />
        <ResourceBar
          label="Memory"
          used={resources.usedMemory}
          total={resources.totalMemory}
          unit="MB"
          color="bg-purple-500"
        />
        <ResourceBar
          label="Disk"
          used={resources.usedDisk}
          total={resources.totalDisk}
          unit="MB"
          color="bg-green-500"
        />
      </div>

      {topNamespaces.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Top Namespaces
          </h4>
          <div className="space-y-1">
            {topNamespaces.map(([ns, usage]) => (
              <div key={ns} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[60%]">{ns}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatValue(usage.cpu, 'MHz')} / {formatValue(usage.memory, 'MB')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
