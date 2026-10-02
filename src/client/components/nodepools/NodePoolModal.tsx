import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui';
import type { NomadNodePool, NomadNodePoolInput } from '../../types/nodepools';
import { Plus, Trash2 } from 'lucide-react';

interface NodePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pool: NomadNodePoolInput) => Promise<void>;
  initialPool?: NomadNodePool | null;
}

interface MetaEntry {
  key: string;
  value: string;
}

export const NodePoolModal: React.FC<NodePoolModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPool,
}) => {
  const isEdit = Boolean(initialPool);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [algorithm, setAlgorithm] = useState<'spread' | 'binpack'>('spread');
  const [metaEntries, setMetaEntries] = useState<MetaEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialPool) {
      setName(initialPool.Name);
      setDescription(initialPool.Description || '');
      setAlgorithm(
        initialPool.SchedulerConfiguration?.SchedulerAlgorithm === 'binpack'
          ? 'binpack'
          : 'spread'
      );
      if (initialPool.Meta) {
        setMetaEntries(
          Object.entries(initialPool.Meta).map(([k, v]) => ({ key: k, value: String(v) }))
        );
      } else {
        setMetaEntries([]);
      }
    } else {
      setName('');
      setDescription('');
      setAlgorithm('spread');
      setMetaEntries([]);
    }
    setError(null);
  }, [initialPool, isOpen]);

  const handleAddMeta = () => {
    setMetaEntries((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveMeta = (index: number) => {
    setMetaEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMetaChange = (index: number, field: 'key' | 'value', val: string) => {
    setMetaEntries((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Node pool name is required');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
      setError('Node pool name must contain only alphanumeric characters, dashes, or underscores');
      return;
    }

    const meta: Record<string, string> = {};
    for (const entry of metaEntries) {
      const k = entry.key.trim();
      if (k) {
        meta[k] = entry.value;
      }
    }

    const payload: NomadNodePoolInput = {
      Name: trimmedName,
      Description: description.trim() || undefined,
      SchedulerConfiguration: {
        SchedulerAlgorithm: algorithm,
      },
      Meta: Object.keys(meta).length > 0 ? meta : undefined,
    };

    setSaving(true);
    setError(null);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save node pool');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Node Pool: ${initialPool?.Name}` : 'Create Node Pool'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
            Node Pool Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isEdit || saving}
            placeholder="e.g. gpu-workers, batch-pool"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed font-mono"
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {isEdit
              ? 'Node pool name cannot be changed once created.'
              : 'Unique identifier for the node pool.'}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
            placeholder="e.g. Dedicated high-memory compute pool"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
            Scheduler Algorithm
          </label>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as 'spread' | 'binpack')}
            disabled={saving}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="spread">spread — Distribute allocations evenly across nodes</option>
            <option value="binpack">binpack — Pack allocations densely onto fewer nodes</option>
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Placement algorithm used by Nomad scheduler for jobs targeting this pool.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Metadata Tags
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddMeta}
              disabled={saving}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Tag
            </Button>
          </div>

          {metaEntries.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic py-2">
              No metadata tags defined.
            </p>
          ) : (
            <div className="space-y-2">
              {metaEntries.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={entry.key}
                    onChange={(e) => handleMetaChange(index, 'key', e.target.value)}
                    placeholder="Key (e.g. tier, env)"
                    className="flex-1 px-3 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={entry.value}
                    onChange={(e) => handleMetaChange(index, 'value', e.target.value)}
                    placeholder="Value (e.g. gpu, highmem)"
                    className="flex-1 px-3 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMeta(index)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-md"
                    title="Remove tag"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Node Pool' : 'Create Node Pool'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
