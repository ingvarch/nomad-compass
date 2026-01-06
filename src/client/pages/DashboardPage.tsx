import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { NomadJob, NomadNode, NomadNamespace, NomadAgentSelf, NomadAgentMembers, NomadAllocation } from '../types/nomad';
import {
  ClusterHealth,
  StatCounters,
  ClusterResources,
  StabilityAlerts,
  RecentActivity,
} from '../components/dashboard';
import {
  analyzeAllocations,
  extractRecentEvents,
} from '../lib/services/allocationAnalyzer';
import { ErrorAlert, PageHeader } from '../components/ui';

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

  const fetchData = useCallback(async () => {
    const client = createNomadClient();

    try {
      const [jobsResponse, nodes, namespaces, agentSelf, agentMembers, allocations] = await Promise.all([
        client.getJobs('*'),
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoized derived data for dashboard sections
  const problematicAllocations = useMemo(
    () => analyzeAllocations(data.allocations),
    [data.allocations]
  );

  const recentEvents = useMemo(
    () => extractRecentEvents(data.allocations, 10),
    [data.allocations]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nomad Cluster Dashboard"
        description="Manage and monitor your Nomad cluster resources"
        actions={
          <Link
            to="/jobs/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Job
          </Link>
        }
      />

      {error && <ErrorAlert message={error} />}

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
        <RecentActivity events={recentEvents} loading={loading} />
      </div>

      <StabilityAlerts problems={problematicAllocations} loading={loading} />
    </div>
  );
}
