import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import type { NomadAllocation } from '../../types/nomad';

interface RestartAllocationModalProps {
  isOpen: boolean;
  allocation: NomadAllocation;
  onClose: () => void;
  onConfirm: (taskName?: string) => Promise<void>;
  isLoading?: boolean;
}

export function RestartAllocationModal({
  isOpen,
  allocation,
  onClose,
  onConfirm,
  isLoading = false,
}: RestartAllocationModalProps) {
  const taskNames = allocation.TaskStates ? Object.keys(allocation.TaskStates) : [];
  const [selectedTask, setSelectedTask] = useState<string>(''); // empty string means entire allocation

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(selectedTask || undefined);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Restart Allocation"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded border border-gray-200 dark:border-gray-700">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Allocation:</span>{' '}
            <span className="font-mono">{allocation.ID.slice(0, 8)}</span> ({allocation.TaskGroup})
          </div>
          <div className="mt-0.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">Job:</span> {allocation.JobID}
          </div>
        </div>

        {/* Restart Scope */}
        <div>
          <label
            htmlFor="restart-scope-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Scope
          </label>
          <select
            id="restart-scope-select"
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Entire allocation (running tasks)</option>
            {taskNames.map((name) => (
              <option key={name} value={name}>
                Task: {name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {selectedTask
              ? `Only the "${selectedTask}" task is restarted, in place on the same node.`
              : 'All running tasks of this allocation are restarted, in place on the same node.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Restart
          </Button>
        </div>
      </form>
    </Modal>
  );
}
