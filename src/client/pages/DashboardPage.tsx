import { useState, useEffect, useCallback, useMemo } from 'react';
import { createNomadClient } from '../lib/api/nomad';
import { NomadJob, NomadNode, NomadNamespace, NomadAgentSelf, NomadAgentMembers, NomadAllocation } from '../types/nomad';
import {
  ClusterHealth,
  StatCounters,
  ClusterResources,
  QuickActions,
  StabilityAlerts,
  ResourceSummary,
  RecentActivity,
} from '../components/dashboard';
import {
  analyzeAllocations,
  calculateResourceSummary,
  extractRecentEvents,
} from '../lib/services/allocationAnalyzer';

interface DashboardData {
  jobs: NomadJob[];
  nodes: NomadNode[];
  namespaces: NomadNamespace[];
  agentSelf: NomadAgentSelf | null;
  agentMembers: NomadAgentMembers | null;
  allocations: NomadAllocation[];
  activeFailedAllocations: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    jobs: [],
    nodes: [],
    namespaces: [],
    agentSelf: null,
    agentMembers: null,
    allocations: [],
    activeFailedAllocations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNamespace, setCurrentNamespace] = useState<string>('*');

  const fetchData = useCallback(async () => {
    const client = createNomadClient();

    try {
      const [jobsResponse, nodes, namespaces, agentSelf, agentMembers, allocations] = await Promise.all([
        client.getJobs(currentNamespace),
        client.getNodes(),
        client.getNamespaces(),
        client.getAgentSelf().catch(() => null),
        client.getAgentMembers().catch(() => null),
        client.getAllocations().catch(() => [] as NomadAllocation[]),
      ]);

      // Count only ACTIVE failed allocations (real allocation objects, not historical counters)
      const activeFailedAllocations = allocations.filter(
        (alloc) => alloc.ClientStatus === 'failed' || alloc.ClientStatus === 'lost'
      ).length;

      setData({
        jobs: jobsResponse.Jobs || [],
        nodes,
        namespaces,
        agentSelf,
        agentMembers,
        allocations,
        activeFailedAllocations,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cluster data');
    } finally {
      setLoading(false);
    }
  }, [currentNamespace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNamespaceChange = (namespace: string) => {
    setCurrentNamespace(namespace);
    setLoading(true);
  };

  // Memoized derived data for new dashboard sections
  const problematicAllocations = useMemo(
    () => analyzeAllocations(data.allocations),
    [data.allocations]
  );

  const resourceSummary = useMemo(
    () => calculateResourceSummary(data.allocations, data.nodes),
    [data.allocations, data.nodes]
  );

  const recentEvents = useMemo(
    () => extractRecentEvents(data.allocations, 10),
    [data.allocations]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Nomad Cluster Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage and monitor your Nomad cluster resources
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <ClusterHealth
        agentSelf={data.agentSelf}
        agentMembers={data.agentMembers}
        nodes={data.nodes}
        activeFailedAllocations={data.activeFailedAllocations}
        loading={loading}
      />

      <StatCounters
        jobs={data.jobs}
        nodes={data.nodes}
        namespaces={data.namespaces}
        activeFailedAllocations={data.activeFailedAllocations}
        loading={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClusterResources nodes={data.nodes} allocations={data.allocations} loading={loading} />
        <QuickActions
          namespaces={data.namespaces}
          currentNamespace={currentNamespace}
          onNamespaceChange={handleNamespaceChange}
          loading={loading}
        />
      </div>

      {/* Stability Alerts */}
      <StabilityAlerts problems={problematicAllocations} loading={loading} />

      {/* Resource Summary and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResourceSummary data={resourceSummary} loading={loading} />
        <RecentActivity events={recentEvents} loading={loading} />
      </div>
    </div>
  );
}
