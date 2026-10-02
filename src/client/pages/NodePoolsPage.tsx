import React, { useState, useMemo, useCallback } from 'react';
import {
  PageHeader,
  RefreshButton,
  Button,
  DataTable,
  Badge,
  ConfirmationDialog,
  LoadingSpinner,
  ErrorAlert,
  type Column,
} from '../components/ui';
import { createNomadClient } from '../lib/api/nomad';
import type { NomadNodePool, NomadNodePoolInput } from '../types/nodepools';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../lib/errors';
import { NodePoolModal } from '../components/nodepools/NodePoolModal';
import { NodePoolDetailModal } from '../components/nodepools/NodePoolDetailModal';
import { Layers, Plus, Search, Edit2, Trash2 } from 'lucide-react';

export default function NodePoolsPage() {
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPool, setSelectedPool] = useState<NomadNodePool | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<NomadNodePool | null>(null);
  const [deletingPool, setDeletingPool] = useState<NomadNodePool | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPools = useCallback(async () => {
    const client = createNomadClient();
    return client.getNodePools();
  }, []);

  const {
    data: rawPools,
    loading,
    error,
    refetch,
  } = useFetch<NomadNodePool[]>(fetchPools, [], {
    errorMessage: 'Failed to load node pools',
    initialData: [],
  });

  const pools = useMemo(() => rawPools || [], [rawPools]);

  const handleSavePool = async (input: NomadNodePoolInput) => {
    const client = createNomadClient();
    await client.createOrUpdateNodePool(input);
    addToast(
      `Node pool "${input.Name}" ${editingPool ? 'updated' : 'created'} successfully`,
      'success'
    );
    refetch();
    // If the saved pool was open in details, update selectedPool
    if (selectedPool?.Name === input.Name) {
      const updated = await client.getNodePool(input.Name);
      setSelectedPool(updated);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPool) return;
    const client = createNomadClient();
    try {
      setIsDeleting(true);
      await client.deleteNodePool(deletingPool.Name);
      addToast(`Node pool "${deletingPool.Name}" deleted`, 'success');
      setDeletingPool(null);
      if (selectedPool?.Name === deletingPool.Name) {
        setSelectedPool(null);
      }
      refetch();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter pools by search
  const filteredPools = useMemo(() => {
    if (!searchQuery.trim()) return pools;
    const q = searchQuery.toLowerCase();
    return pools.filter((p) => {
      if (p.Name.toLowerCase().includes(q)) return true;
      if (p.Description && p.Description.toLowerCase().includes(q)) return true;
      if (
        p.SchedulerConfiguration?.SchedulerAlgorithm &&
        p.SchedulerConfiguration.SchedulerAlgorithm.toLowerCase().includes(q)
      ) {
        return true;
      }
      if (p.Meta) {
        const metaMatch = Object.entries(p.Meta).some(
          ([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
        );
        if (metaMatch) return true;
      }
      return false;
    });
  }, [pools, searchQuery]);

  // Pool stats
  const stats = useMemo(() => {
    let spreadCount = 0;
    let binpackCount = 0;
    for (const pool of pools) {
      if (pool.SchedulerConfiguration?.SchedulerAlgorithm === 'binpack') {
        binpackCount++;
      } else {
        spreadCount++;
      }
    }
    return {
      total: pools.length,
      spread: spreadCount,
      binpack: binpackCount,
    };
  }, [pools]);

  const columns: Column<NomadNodePool>[] = [
    {
      key: 'name',
      header: 'Node Pool',
      render: (pool) => {
        const isDefault = pool.Name.toLowerCase() === 'default';
        return (
          <button
            type="button"
            onClick={() => setSelectedPool(pool)}
            className="flex items-center gap-2 font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline text-left"
          >
            <Layers className="w-4 h-4 text-blue-500 shrink-0" />
            <span>{pool.Name}</span>
            {isDefault && (
              <Badge variant="gray" size="sm">
                default
              </Badge>
            )}
          </button>
        );
      },
    },
    {
      key: 'algorithm',
      header: 'Algorithm',
      render: (pool) => {
        const algo = pool.SchedulerConfiguration?.SchedulerAlgorithm || 'spread';
        return (
          <Badge variant={algo === 'binpack' ? 'purple' : 'blue'} size="sm">
            {algo}
          </Badge>
        );
      },
    },
    {
      key: 'description',
      header: 'Description',
      render: (pool) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
          {pool.Description || '—'}
        </span>
      ),
    },
    {
      key: 'meta',
      header: 'Metadata',
      render: (pool) => {
        if (!pool.Meta || Object.keys(pool.Meta).length === 0) {
          return <span className="text-xs text-gray-400">—</span>;
        }
        const entries = Object.entries(pool.Meta);
        return (
          <div className="flex flex-wrap gap-1">
            {entries.slice(0, 3).map(([k, v]) => (
              <span
                key={k}
                className="text-[11px] px-1.5 py-0.5 rounded font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {k}={v}
              </span>
            ))}
            {entries.length > 3 && (
              <span className="text-[11px] text-gray-400">+{entries.length - 3}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      textAlign: 'right',
      render: (pool) => {
        const isDefault = pool.Name.toLowerCase() === 'default';
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingPool(pool);
              }}
              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Edit node pool"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingPool(pool);
              }}
              disabled={isDefault}
              className={`p-1.5 rounded-lg transition-colors ${
                isDefault
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={isDefault ? 'Default pool cannot be deleted' : 'Delete node pool'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Node Pools"
        description="Partition cluster nodes into distinct scheduling pools for targeted workloads"
        actions={
          <div className="flex items-center gap-2">
            <RefreshButton onClick={refetch} />
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Node Pool
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      {/* Filter and stats row */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search node pools by name, description, tags..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Total: <strong className="text-gray-900 dark:text-white">{stats.total}</strong>
          </span>
          <span>•</span>
          <span>
            Spread: <strong className="text-blue-600 dark:text-blue-400">{stats.spread}</strong>
          </span>
          <span>•</span>
          <span>
            Binpack: <strong className="text-purple-600 dark:text-purple-400">{stats.binpack}</strong>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <DataTable
          items={filteredPools}
          columns={columns}
          keyExtractor={(pool) => pool.Name}
          emptyState={{
            message: searchQuery
              ? 'No node pools match your search query.'
              : 'No node pools found.',
          }}
          mobileCardRenderer={(pool) => {
            const isDefault = pool.Name.toLowerCase() === 'default';
            const algo = pool.SchedulerConfiguration?.SchedulerAlgorithm || 'spread';
            return (
              <div
                key={pool.Name}
                onClick={() => setSelectedPool(pool)}
                className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="font-mono font-semibold text-sm text-gray-900 dark:text-white">
                      {pool.Name}
                    </span>
                    {isDefault && (
                      <Badge variant="gray" size="sm">
                        default
                      </Badge>
                    )}
                  </div>
                  <Badge variant={algo === 'binpack' ? 'purple' : 'blue'} size="sm">
                    {algo}
                  </Badge>
                </div>

                {pool.Description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">{pool.Description}</p>
                )}

                {pool.Meta && Object.keys(pool.Meta).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {Object.entries(pool.Meta).map(([k, v]) => (
                      <span
                        key={k}
                        className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {k}={v}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPool(pool);
                    }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg"
                    title="Edit node pool"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingPool(pool);
                    }}
                    disabled={isDefault}
                    className={`p-1.5 rounded-lg ${
                      isDefault
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-500 hover:text-red-600'
                    }`}
                    title={isDefault ? 'Default pool cannot be deleted' : 'Delete node pool'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedPool && (
        <NodePoolDetailModal
          pool={selectedPool}
          isOpen={Boolean(selectedPool)}
          onClose={() => setSelectedPool(null)}
          onEdit={(pool) => {
            setSelectedPool(null);
            setEditingPool(pool);
          }}
          onDelete={(pool) => {
            setDeletingPool(pool);
          }}
        />
      )}

      {/* Create / Edit Modal */}
      {(isCreateModalOpen || editingPool) && (
        <NodePoolModal
          isOpen={isCreateModalOpen || Boolean(editingPool)}
          initialPool={editingPool}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingPool(null);
          }}
          onSave={handleSavePool}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(deletingPool)}
        onClose={() => setDeletingPool(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Node Pool"
        mode="delete"
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Node Pool'}
        isLoading={isDeleting}
        message={`Are you sure you want to delete the node pool "${deletingPool?.Name}"? Any jobs targeting this pool will fail to place allocations until reassigned.`}
      />
    </div>
  );
}
