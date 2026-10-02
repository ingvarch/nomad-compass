import { useMemo } from 'react';
import type { NomadAllocation } from '../../../types/nomad';
import { DataTable, RefreshButton, type Column } from '../../ui';
import { AllocationActionsDropdown, AllocationStatusBadge } from '../../allocations';
import { formatTimestamp } from '../../../lib/utils/dateFormatter';

interface AllocationsTabProps {
  allocations: NomadAllocation[];
  onRefresh: () => void | Promise<void>;
}

function nodeLabel(alloc: NomadAllocation): string {
  return alloc.NodeName || alloc.NodeID?.slice(0, 8) || '-';
}

export function AllocationsTab({ allocations, onRefresh }: AllocationsTabProps) {
  // Sort by CreateTime descending (newest first)
  const items = useMemo(
    () => [...allocations].sort((a, b) => b.CreateTime - a.CreateTime),
    [allocations]
  );

  const columns: Column<NomadAllocation>[] = useMemo(() => [
    {
      key: 'id',
      header: 'ID',
      render: (alloc) => (
        <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
          {alloc.ID.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'taskGroup',
      header: 'Task Group',
      render: (alloc) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{alloc.TaskGroup}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (alloc) => <AllocationStatusBadge allocation={alloc} />,
    },
    {
      key: 'node',
      header: 'Node',
      render: (alloc) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{nodeLabel(alloc)}</span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (alloc) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatTimestamp(alloc.CreateTime)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      textAlign: 'right',
      render: (alloc) => (
        <AllocationActionsDropdown allocation={alloc} onSuccess={onRefresh} />
      ),
    },
  ], [onRefresh]);

  return (
    <div className="py-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Allocations ({items.length})
        </h3>
        <RefreshButton onClick={onRefresh} />
      </div>

      <DataTable
        items={items}
        columns={columns}
        keyExtractor={(alloc) => alloc.ID}
        emptyState={{ message: 'This job has no allocations.' }}
        mobileCardRenderer={(alloc) => (
          <div className="p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {alloc.TaskGroup}
                </span>
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                  {alloc.ID.slice(0, 8)}
                </span>
              </div>
              <AllocationStatusBadge allocation={alloc} />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
              <span>{nodeLabel(alloc)}</span>
              <div className="flex items-center gap-3">
                <span>{formatTimestamp(alloc.CreateTime)}</span>
                <AllocationActionsDropdown allocation={alloc} onSuccess={onRefresh} />
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
