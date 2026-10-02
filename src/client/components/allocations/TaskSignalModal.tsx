import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import type { NomadAllocation } from '../../types/nomad';

interface TaskSignalModalProps {
  isOpen: boolean;
  allocation: NomadAllocation;
  onClose: () => void;
  onConfirm: (task: string, signal: string) => Promise<void>;
  isLoading?: boolean;
}

interface SignalOption {
  value: string;
  label: string;
  description: string;
}

const AVAILABLE_SIGNALS: SignalOption[] = [
  { value: 'SIGHUP', label: 'SIGHUP (1)', description: 'Reload configuration without stopping process' },
  { value: 'SIGINT', label: 'SIGINT (2)', description: 'Interrupt process (Ctrl+C equivalent)' },
  { value: 'SIGQUIT', label: 'SIGQUIT (3)', description: 'Quit process and dump core' },
  { value: 'SIGTERM', label: 'SIGTERM (15)', description: 'Graceful termination request' },
  { value: 'SIGKILL', label: 'SIGKILL (9)', description: 'Force kill process immediately (uncatchable)' },
  { value: 'SIGUSR1', label: 'SIGUSR1 (10)', description: 'User-defined signal 1 (application specific)' },
  { value: 'SIGUSR2', label: 'SIGUSR2 (12)', description: 'User-defined signal 2 (application specific)' },
];

export function TaskSignalModal({
  isOpen,
  allocation,
  onClose,
  onConfirm,
  isLoading = false,
}: TaskSignalModalProps) {
  const taskNames = useMemo(
    () => (allocation.TaskStates ? Object.keys(allocation.TaskStates) : []),
    [allocation.TaskStates]
  );
  const [selectedTask, setSelectedTask] = useState<string>(taskNames[0] || '');
  const [selectedSignal, setSelectedSignal] = useState<string>('SIGHUP');

  // Reset selected task when allocation changes or modal opens
  useEffect(() => {
    if (taskNames.length > 0 && (!selectedTask || !taskNames.includes(selectedTask))) {
      setSelectedTask(taskNames[0]);
    }
  }, [allocation, isOpen, taskNames, selectedTask]);

  const activeSignalInfo = AVAILABLE_SIGNALS.find((s) => s.value === selectedSignal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !selectedSignal) return;
    await onConfirm(selectedTask, selectedSignal);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Signal to Task"
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

        {/* Task Selection */}
        <div>
          <label
            htmlFor="signal-task-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Task
          </label>
          {taskNames.length > 0 ? (
            <select
              id="signal-task-select"
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {taskNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="signal-task-select"
              type="text"
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              placeholder="Task name"
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {/* Signal Selection */}
        <div>
          <label
            htmlFor="signal-type-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Signal
          </label>
          <select
            id="signal-type-select"
            value={selectedSignal}
            onChange={(e) => setSelectedSignal(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          >
            {AVAILABLE_SIGNALS.map((sig) => (
              <option key={sig.value} value={sig.value}>
                {sig.label}
              </option>
            ))}
          </select>
          {activeSignalInfo && (
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {activeSignalInfo.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={!selectedTask}>
            Send Signal
          </Button>
        </div>
      </form>
    </Modal>
  );
}
