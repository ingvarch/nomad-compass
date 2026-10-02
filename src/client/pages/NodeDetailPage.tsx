import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { getErrorMessage } from '../lib/errors';
import { NomadNodeDetail, NomadAllocation } from '../types/nomad';
import { LoadingSpinner, ErrorAlert, RefreshButton, Badge, Button, ConfirmationDialog } from '../components/ui';
import { NodeAttributes } from '../components/nodes/NodeAttributes';
import { NodeAllocations } from '../components/nodes/NodeAllocations';
import { NodeDrainModal, type NodeDrainConfirmOptions } from '../components/nodes/NodeDrainModal';
import { getNodeStatusColor, getNodeEligibilityColor } from '../lib/utils/statusColors';
import { useToast } from '../context/ToastContext';

type TabType = 'overview' | 'allocations' | 'events';

export default function NodeDetailPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [node, setNode] = useState<NomadNodeDetail | null>(null);
  const [allocations, setAllocations] = useState<NomadAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const [isDrainModalOpen, setIsDrainModalOpen] = useState(false);
  const [isCancelDrainDialogOpen, setIsCancelDrainDialogOpen] = useState(false);
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNodeData = useCallback(async () => {
    if (!nodeId) return;

    setLoading(true);
    try {
      const client = createNomadClient();
      const [nodeData, allocData] = await Promise.all([
        client.getNode(nodeId),
        client.getNodeAllocations(nodeId),
      ]);
      setNode(nodeData);
      setAllocations(allocData || []);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch node details'));
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchNodeData();
  }, [fetchNodeData]);

  const handleDrainConfirm = async (options: NodeDrainConfirmOptions) => {
    if (!node) return;
    try {
      setActionLoading(true);
      const client = createNomadClient();
      await client.drainNode(node.ID, {
        Deadline: options.deadline,
        IgnoreSystemJobs: options.ignoreSystemJobs,
      });
      addToast(`Drain initiated on node "${node.Name}"`, 'success');
      setIsDrainModalOpen(false);
      await fetchNodeData();
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to drain node'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDrainConfirm = async () => {
    if (!node) return;
    try {
      setActionLoading(true);
      const client = createNomadClient();
      await client.drainNode(node.ID, null, true);
      addToast(`Drain canceled on node "${node.Name}"`, 'success');
      setIsCancelDrainDialogOpen(false);
      await fetchNodeData();
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to cancel drain'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleEligibility = async () => {
    if (!node) return;
    const newEligibility = node.SchedulingEligibility === 'eligible' ? 'ineligible' : 'eligible';
    try {
      setActionLoading(true);
      const client = createNomadClient();
      await client.toggleNodeEligibility(node.ID, newEligibility);
      addToast(`Node "${node.Name}" marked as ${newEligibility}`, 'success');
      await fetchNodeData();
    } catch (err) {
      addToast(getErrorMessage(err, `Failed to mark node as ${newEligibility}`), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurgeConfirm = async () => {
    if (!node) return;
    try {
      setActionLoading(true);
      const client = createNomadClient();
      await client.purgeNode(node.ID);
      addToast(`Node "${node.Name}" purged successfully`, 'success');
      setIsPurgeDialogOpen(false);
      navigate('/nodes');
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to purge node'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4">
        <ErrorAlert message={error} />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="py-4">
        <ErrorAlert message="Node not found" />
      </div>
    );
  }

  const statusColors = getNodeStatusColor(node.Status);
  const eligibilityColors = getNodeEligibilityColor(node.SchedulingEligibility);
  const runningAllocs = allocations.filter(a => a.ClientStatus === 'running').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {node.Name}
              </h1>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}>
                {node.Status}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${eligibilityColors.bg} ${eligibilityColors.text}`}>
                {node.SchedulingEligibility}
              </span>
              <Badge variant={node.NodePool && node.NodePool !== 'default' ? 'purple' : 'gray'}>
                pool: {node.NodePool || 'default'}
              </Badge>
              {node.Drain && (
                <Badge variant="red">draining</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-mono">
              {node.ID}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {node.Drain ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCancelDrainDialogOpen(true)}
                disabled={actionLoading}
              >
                Cancel Drain
              </Button>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDrainModalOpen(true)}
                disabled={actionLoading}
              >
                Drain Node
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleEligibility}
              disabled={actionLoading}
            >
              {node.SchedulingEligibility === 'eligible' ? 'Make Ineligible' : 'Make Eligible'}
            </Button>

            {node.Status === 'down' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsPurgeDialogOpen(true)}
                disabled={actionLoading}
              >
                Purge Node
              </Button>
            )}

            <RefreshButton onClick={fetchNodeData} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Datacenter</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {node.Datacenter || '-'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Node Class</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {node.NodeClass || 'default'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Version</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {node.Version || '-'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Running Allocations</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {runningAllocs}
          </div>
        </div>
      </div>

      {/* Resource Utilization */}
      {node.NodeResources && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">CPU</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {node.NodeResources.Cpu.CpuShares} MHz
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
              {node.ReservedResources?.Cpu && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {node.ReservedResources.Cpu.CpuShares} MHz reserved
                </div>
              )}
            </div>

            {/* Memory */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">Memory</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {Math.round(node.NodeResources.Memory.MemoryMB / 1024 * 10) / 10} GB
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
              {node.ReservedResources?.Memory && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {node.ReservedResources.Memory.MemoryMB} MB reserved
                </div>
              )}
            </div>

            {/* Disk */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">Disk</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {Math.round(node.NodeResources.Disk.DiskMB / 1024 * 10) / 10} GB
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
              {node.ReservedResources?.Disk && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {node.ReservedResources.Disk.DiskMB} MB reserved
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto no-scrollbar scroll-smooth">
            {(['overview', 'allocations', 'events'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 sm:px-6 py-3 text-sm font-medium capitalize flex-shrink-0 whitespace-nowrap active:opacity-80 transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab}
                {tab === 'allocations' && ` (${allocations.length})`}
                {tab === 'events' && node.Events && ` (${node.Events.length})`}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <NodeAttributes node={node} />}
          {activeTab === 'allocations' && <NodeAllocations allocations={allocations} />}
          {activeTab === 'events' && (
            <div className="space-y-4">
              {node.Events && node.Events.length > 0 ? (
                <div className="space-y-2">
                  {node.Events.slice().reverse().map((event, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[160px]">
                        {new Date(event.Timestamp).toLocaleString()}
                      </div>
                      <div className="flex-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 mr-2">
                          {event.Subsystem}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {event.Message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No events recorded
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drain Modal */}
      {isDrainModalOpen && (
        <NodeDrainModal
          isOpen={isDrainModalOpen}
          node={{
            ID: node.ID,
            Name: node.Name,
            allocationsCount: runningAllocs,
          }}
          onClose={() => setIsDrainModalOpen(false)}
          onConfirm={handleDrainConfirm}
          isLoading={actionLoading}
        />
      )}

      {/* Cancel Drain Confirmation */}
      <ConfirmationDialog
        isOpen={isCancelDrainDialogOpen}
        onClose={() => setIsCancelDrainDialogOpen(false)}
        onConfirm={handleCancelDrainConfirm}
        title="Stop Drain"
        mode="confirm"
        confirmLabel="Stop Drain"
        isLoading={actionLoading}
        message={`Are you sure you want to stop draining on node "${node.Name}"? This will halt allocation migration and mark the node eligible for task placement.`}
      />

      {/* Purge Node Confirmation */}
      <ConfirmationDialog
        isOpen={isPurgeDialogOpen}
        onClose={() => setIsPurgeDialogOpen(false)}
        onConfirm={handlePurgeConfirm}
        title="Purge Node"
        mode="delete"
        confirmLabel="Purge Node"
        isLoading={actionLoading}
        message={`Are you sure you want to permanently purge dead node "${node.Name}" (${node.ID}) from the cluster state?`}
      />
    </div>
  );
}
