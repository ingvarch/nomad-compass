import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge, LoadingSpinner } from '../ui';
import type { NomadNodePool } from '../../types/nodepools';
import type { NomadNode } from '../../types/nomad';
import { createNomadClient } from '../../lib/api/nomad';
import { getNodeStatusColor, getStatusClasses } from '../../lib/utils/statusColors';
import { Edit2, Trash2, Server, Cpu, HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NodePoolDetailModalProps {
  pool: NomadNodePool | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (pool: NomadNodePool) => void;
  onDelete: (pool: NomadNodePool) => void;
}

function formatResources(cpu?: number, memoryMB?: number): string {
  if (cpu === undefined || memoryMB === undefined) return '—';
  const memoryGB = (memoryMB / 1024).toFixed(1);
  return `${cpu} MHz / ${memoryGB} GB`;
}

export const NodePoolDetailModal: React.FC<NodePoolDetailModalProps> = ({
  pool,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [nodes, setNodes] = useState<NomadNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pool || !isOpen) {
      setNodes([]);
      return;
    }

    let isMounted = true;
    const fetchNodes = async () => {
      setLoadingNodes(true);
      setError(null);
      try {
        const client = createNomadClient();
        const poolNodes = await client.getNodePoolNodes(pool.Name);
        if (isMounted) {
          setNodes(poolNodes);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch pool nodes');
        }
      } finally {
        if (isMounted) {
          setLoadingNodes(false);
        }
      }
    };

    fetchNodes();

    return () => {
      isMounted = false;
    };
  }, [pool, isOpen]);

  if (!pool) return null;

  const isDefault = pool.Name.toLowerCase() === 'default';
  const algorithm = pool.SchedulerConfiguration?.SchedulerAlgorithm || 'spread';
  const metaKeys = pool.Meta ? Object.keys(pool.Meta) : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Node Pool: ${pool.Name}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Pool Metadata & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-lg text-gray-900 dark:text-white font-mono">
                {pool.Name}
              </span>
              <Badge variant={algorithm === 'binpack' ? 'purple' : 'blue'}>
                {algorithm}
              </Badge>
              {isDefault && (
                <Badge variant="gray">default</Badge>
              )}
            </div>
            {pool.Description ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">{pool.Description}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">No description provided</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEdit(pool)}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => onDelete(pool)}
              disabled={isDefault}
              title={isDefault ? 'The default node pool cannot be deleted' : 'Delete node pool'}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
          </div>
        </div>

        {/* Meta tags if any */}
        {metaKeys.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Metadata Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {metaKeys.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                >
                  <span className="text-gray-400 mr-1">{key}:</span>
                  <span className="font-semibold">{pool.Meta![key]}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Nodes in this pool */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Server className="w-4 h-4 text-gray-400" />
              Assigned Nodes ({nodes.length})
            </h4>
          </div>

          {loadingNodes ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg">
              {error}
            </div>
          ) : nodes.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 text-sm">
              No client nodes are currently assigned to this node pool.
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
              {nodes.map((node) => {
                const statusColors = getNodeStatusColor(node.Status, node.Drain);
                return (
                  <div
                    key={node.ID}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/nodes/${node.ID}`}
                          onClick={onClose}
                          className="font-medium text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {node.Name}
                        </Link>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClasses(statusColors)}`}>
                          {node.Drain ? 'draining' : node.Status}
                        </span>
                        {node.Datacenter && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {node.Datacenter}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-gray-400 dark:text-gray-500">
                        {node.ID}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      {node.NodeResources && (
                        <div className="flex items-center gap-1.5" title="CPU / Memory">
                          <Cpu className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {formatResources(
                              node.NodeResources.Cpu.CpuShares,
                              node.NodeResources.Memory.MemoryMB
                            )}
                          </span>
                        </div>
                      )}
                      {node.NodeClass && (
                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                          {node.NodeClass}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
