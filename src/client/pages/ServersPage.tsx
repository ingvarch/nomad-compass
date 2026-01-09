import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { NomadAgentMember } from '../types/nomad';
import {
  LoadingSpinner,
  ErrorAlert,
  PageHeader,
  RefreshButton,
  FilterButtons,
  BackLink,
  FilterOption,
} from '../components/ui';
import { getServerStatusColor, getStatusClasses } from '../lib/utils/statusColors';

type StatusFilter = 'all' | 'alive' | 'failed' | 'left';

export default function ServersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState<NomadAgentMember[]>([]);
  const [serverInfo, setServerInfo] = useState<{
    region: string;
    datacenter: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as StatusFilter) || 'all';

  const fetchData = useCallback(async () => {
    const client = createNomadClient();

    try {
      const data = await client.getAgentMembers();
      setMembers(data.Members || []);
      setServerInfo({
        region: data.ServerRegion,
        datacenter: data.ServerDC,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredMembers = members.filter((member) => {
    if (statusFilter === 'all') return true;
    return member.Status.toLowerCase() === statusFilter;
  });

  const stats = useMemo(
    () => ({
      alive: members.filter((m) => m.Status.toLowerCase() === 'alive').length,
      failed: members.filter((m) => m.Status.toLowerCase() === 'failed').length,
      left: members.filter((m) => m.Status.toLowerCase() === 'left').length,
    }),
    [members]
  );

  const setFilter = (filter: StatusFilter) => {
    if (filter === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', filter);
    }
    setSearchParams(searchParams);
  };

  const filterOptions: FilterOption<StatusFilter>[] = [
    { value: 'all', label: 'All', count: members.length },
    { value: 'alive', label: 'Alive', count: stats.alive, color: 'bg-green-500' },
    { value: 'failed', label: 'Failed', count: stats.failed, color: 'bg-red-500' },
    { value: 'left', label: 'Left', count: stats.left, color: 'bg-gray-500' },
  ];

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
        actions={
          <RefreshButton
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
          />
        }
      />

      {error && <ErrorAlert message={error} />}

      {/* Status Filter */}
      <FilterButtons
        options={filterOptions}
        activeValue={statusFilter}
        onFilterChange={setFilter}
      />

      {/* Servers Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No servers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Port
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Protocol
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMembers.map((member) => {
                  const statusColors = getServerStatusColor(member.Status);
                  return (
                    <tr
                      key={member.Name}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {member.Name}
                          </span>
                          {member.Leader && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              Leader
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClasses(statusColors)}`}
                        >
                          {member.Status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {member.Addr}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {member.Port}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        v{member.ProtocolCur} (min: {member.ProtocolMin}, max:{' '}
                        {member.ProtocolMax})
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
