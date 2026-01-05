import { useState, useEffect, useCallback } from 'react';
import { createNomadClient } from '../lib/api/nomad';
import { NomadJob, NomadNode, NomadNamespace, NomadAgentSelf, NomadAgentMembers } from '../types/nomad';
import { ClusterHealth, StatCounters, ClusterResources, QuickActions } from '../components/dashboard';

interface DashboardData {
  jobs: NomadJob[];
  nodes: NomadNode[];
  namespaces: NomadNamespace[];
  agentSelf: NomadAgentSelf | null;
  agentMembers: NomadAgentMembers | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    jobs: [],
    nodes: [],
    namespaces: [],
    agentSelf: null,
    agentMembers: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNamespace, setCurrentNamespace] = useState<string>('*');

  const fetchData = useCallback(async () => {
    const client = createNomadClient();

    try {
      const [jobsResponse, nodes, namespaces, agentSelf, agentMembers] = await Promise.all([
        client.getJobs(currentNamespace),
        client.getNodes(),
        client.getNamespaces(),
        client.getAgentSelf().catch(() => null),
        client.getAgentMembers().catch(() => null),
      ]);

      setData({
        jobs: jobsResponse.Jobs || [],
        nodes,
        namespaces,
        agentSelf,
        agentMembers,
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
        jobs={data.jobs}
        loading={loading}
      />

      <StatCounters jobs={data.jobs} nodes={data.nodes} namespaces={data.namespaces} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClusterResources nodes={data.nodes} loading={loading} />
        <QuickActions
          namespaces={data.namespaces}
          currentNamespace={currentNamespace}
          onNamespaceChange={handleNamespaceChange}
          loading={loading}
        />
      </div>
    </div>
  );
}
