import { Link } from 'react-router-dom';
import { NomadAllocation } from '../../types/nomad';

interface NodeAllocationsProps {
  allocations: NomadAllocation[];
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'running':
      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' };
    case 'pending':
      return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' };
    case 'complete':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' };
    case 'failed':
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' };
    case 'lost':
      return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' };
  }
}

export function NodeAllocations({ allocations }: NodeAllocationsProps) {
  if (allocations.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        No allocations on this node
      </div>
    );
  }

  // Group allocations by status
  const running = allocations.filter(a => a.ClientStatus === 'running');
  const pending = allocations.filter(a => a.ClientStatus === 'pending');
  const other = allocations.filter(a => !['running', 'pending'].includes(a.ClientStatus));

  // Sort: running first, then pending, then others (most recent first)
  const sortedAllocations = [...running, ...pending, ...other];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Allocation
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Job
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Task Group
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Version
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedAllocations.map((alloc) => {
            const statusColors = getStatusColor(alloc.ClientStatus);
            return (
              <tr key={alloc.ID} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono text-sm text-gray-900 dark:text-white">
                    {alloc.ID.slice(0, 8)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    to={`/jobs/${alloc.JobID}?namespace=${alloc.Namespace}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {alloc.JobID}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {alloc.TaskGroup}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}>
                    {alloc.ClientStatus}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  v{alloc.JobVersion}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
