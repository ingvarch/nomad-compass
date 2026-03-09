import { useMemo } from 'react';
import { createNomadClient } from '../lib/api/nomad';
import type { NomadAgentMember } from '../types/nomad';
import { useFetch } from '../hooks/useFetch';
import { useFilteredData } from '../hooks/useFilteredData';
import {
  LoadingSpinner,
  ErrorAlert,
  PageHeader,
  RefreshButton,
  FilterButtons,
  BackLink,
  DataTable,
  Badge,
  type Column,
} from '../components/ui';
import { getServerStatusColor, getStatusClasses } from '../lib/utils/statusColors';

type StatusFilter = 'all' | 'alive' | 'failed' | 'left';

interface ServerData {
  members: NomadAgentMember[];
  serverInfo: { region: string; datacenter: string } | null;
}

export default function ServersPage() {
  const { data, loading, error, refetch } = useFetch(
    async (): Promise<ServerData> => {
      const client = createNomadClient();
      const response = await client.getAgentMembers();
      return {
        members: response.Members || [],
        serverInfo: {
          region: response.ServerRegion,
          datacenter: response.ServerDC,
        },
      };
    },
    [],
    { initialData: { members: [], serverInfo: null }, errorMessage: 'Failed to fetch servers' }
  );

  const members = useMemo(() => data?.members || [], [data]);
  const serverInfo = data?.serverInfo || null;

  const { activeFilter, filteredItems, filterOptions, setFilter } = useFilteredData<NomadAgentMember, StatusFilter>(
    members,
    {
      defaultValue: 'all',
      filters: [
        { value: 'all', label: 'All', predicate: () => true },
        { value: 'alive', label: 'Alive', predicate: (m) => m.Status.toLowerCase() === 'alive', color: 'bg-green-500' },
        { value: 'failed', label: 'Failed', predicate: (m) => m.Status.toLowerCase() === 'failed', color: 'bg-red-500' },
        { value: 'left', label: 'Left', predicate: (m) => m.Status.toLowerCase() === 'left', color: 'bg-gray-500' },
      ],
    }
  );

  const columns: Column<NomadAgentMember>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      render: (member) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">
            {member.Name}
          </span>
          {member.Leader && (
            <Badge variant="blue">Leader</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (member) => {
        const statusColors = getServerStatusColor(member.Status);
        return (
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClasses(statusColors)}`}>
            {member.Status}
          </span>
        );
      },
    },
    {
      key: 'address',
      header: 'Address',
      render: (member) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
          {member.Addr}
        </span>
      ),
    },
    {
      key: 'port',
      header: 'Port',
      render: (member) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{member.Port}</span>
      ),
    },
    {
      key: 'protocol',
      header: 'Protocol',
      render: (member) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          v{member.ProtocolCur} (min: {member.ProtocolMin}, max: {member.ProtocolMax})
        </span>
      ),
    },
  ], []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Servers" description="View cluster server nodes" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servers"
        description={
          serverInfo
            ? `Region: ${serverInfo.region} | Datacenter: ${serverInfo.datacenter}`
            : 'View cluster server nodes'
        }
        actions={<RefreshButton onClick={refetch} />}
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
        keyExtractor={(member) => member.Name}
        emptyState={{ message: 'No servers found.' }}
      />

      <BackLink to="/dashboard" />
    </div>
  );
}
