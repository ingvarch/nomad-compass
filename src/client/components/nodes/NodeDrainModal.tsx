import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, Clock } from 'lucide-react';

export interface NodeDrainConfirmOptions {
  deadline: number; // nanoseconds
  ignoreSystemJobs: boolean;
}

interface NodeDrainModalProps {
  isOpen: boolean;
  node: {
    ID: string;
    Name: string;
    allocationsCount?: number;
  };
  onClose: () => void;
  onConfirm: (options: NodeDrainConfirmOptions) => Promise<void>;
  isLoading?: boolean;
}

type DeadlinePreset = 'none' | '15m' | '1h' | '4h' | 'custom';

const PRESET_DURATIONS: Record<Exclude<DeadlinePreset, 'custom'>, number> = {
  none: 0,
  '15m': 15 * 60 * 1e9,
  '1h': 60 * 60 * 1e9,
  '4h': 4 * 60 * 60 * 1e9,
};

export function NodeDrainModal({
  isOpen,
  node,
  onClose,
  onConfirm,
  isLoading = false,
}: NodeDrainModalProps) {
  const [preset, setPreset] = useState<DeadlinePreset>('1h');
  const [customMinutes, setCustomMinutes] = useState<number>(30);
  const [ignoreSystemJobs, setIgnoreSystemJobs] = useState(false);

  const getDeadlineNanoseconds = (): number => {
    if (preset === 'custom') {
      const minutes = Math.max(1, Number(customMinutes) || 1);
      return minutes * 60 * 1e9;
    }
    return PRESET_DURATIONS[preset];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      deadline: getDeadlineNanoseconds(),
      ignoreSystemJobs,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Drain Node: ${node.Name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Warning Callout */}
        <div className="flex items-start gap-3 p-3.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="w-5 h-5 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">
              Initiate allocation migration for <span className="font-mono text-xs">{node.ID}</span>
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Draining will safely stop and migrate{' '}
              <strong>{node.allocationsCount ?? 0} running allocation{(node.allocationsCount ?? 0) !== 1 ? 's' : ''}</strong>{' '}
              away from this node to other eligible nodes in the cluster.
            </p>
          </div>
        </div>

        {/* Deadline Preset Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Drain Deadline
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              { id: 'none', label: 'No deadline' },
              { id: '15m', label: '15m' },
              { id: '1h', label: '1h' },
              { id: '4h', label: '4h' },
              { id: 'custom', label: 'Custom' },
            ].map(({ id, label }) => {
              const active = preset === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreset(id as DeadlinePreset)}
                  className={`py-2 px-2.5 text-xs font-medium rounded-lg border text-center transition-all ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {preset === 'custom' && (
            <div className="pt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  placeholder="Minutes"
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">minutes</span>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {preset === 'none'
              ? 'Allocations migrate without deadline pressure. Migrations wait until tasks finish or are rescheduled.'
              : 'Tasks that fail to migrate before the deadline will be forcefully terminated.'}
          </p>
        </div>

        {/* Ignore System Jobs Checkbox */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="ignore-system-jobs"
              checked={ignoreSystemJobs}
              onChange={(e) => setIgnoreSystemJobs(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <div className="text-sm">
              <span className="font-medium text-gray-900 dark:text-white">Ignore system jobs</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                System jobs run on every node in the cluster and do not need to be migrated.
              </p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={isLoading}
          >
            Start Drain
          </Button>
        </div>
      </form>
    </Modal>
  );
}
