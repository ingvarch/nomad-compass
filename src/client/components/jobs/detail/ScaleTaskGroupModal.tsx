import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '../../ui';
import { Minus, Plus, AlertTriangle, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import type { NomadTaskGroup } from '../../../types/nomad';
import { getErrorMessage } from '../../../lib/errors';

export interface ScaleTaskGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskGroup: NomadTaskGroup | null;
  onScale: (groupName: string, count: number, message?: string) => Promise<void>;
}

export const ScaleTaskGroupModal: React.FC<ScaleTaskGroupModalProps> = ({
  isOpen,
  onClose,
  taskGroup,
  onScale,
}) => {
  const currentCount = taskGroup?.Count ?? 0;
  const [count, setCount] = useState<number>(currentCount);
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskGroup) {
      setCount(taskGroup.Count ?? 0);
      setMessage('');
      setError(null);
    }
  }, [taskGroup, isOpen]);

  if (!isOpen || !taskGroup) return null;

  const diff = count - currentCount;
  const isUnchanged = count === currentCount;
  const isValidCount = !isNaN(count) && count >= 0;

  const handleIncrement = () => {
    setCount((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setCount((prev) => Math.max(0, prev - 1));
  };

  const handleDelta = (delta: number) => {
    setCount((prev) => Math.max(0, prev + delta));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCount || isUnchanged || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await onScale(taskGroup.Name, count, message.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Scale Task Group: ${taskGroup.Name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Current status overview */}
        <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Current Desired Count
            </span>
          </div>
          <Badge variant="blue" size="sm">
            {currentCount} {currentCount === 1 ? 'allocation' : 'allocations'}
          </Badge>
        </div>

        {/* Number stepper */}
        <div className="space-y-2">
          <label
            htmlFor="target-count"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Target Desired Count
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={count <= 0 || isSubmitting}
              className="p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Decrease count"
            >
              <Minus className="w-5 h-5" />
            </button>

            <input
              id="target-count"
              type="number"
              min={0}
              step={1}
              value={count}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setCount(isNaN(val) ? 0 : Math.max(0, val));
              }}
              disabled={isSubmitting}
              className="block w-full text-center text-xl font-bold font-mono py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />

            <button
              type="button"
              onClick={handleIncrement}
              disabled={isSubmitting}
              className="p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Increase count"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Delta Pills */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Quick adjust:</span>
            <button
              type="button"
              onClick={() => handleDelta(-5)}
              disabled={count <= 0 || isSubmitting}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => handleDelta(-1)}
              disabled={count <= 0 || isSubmitting}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              -1
            </button>
            <button
              type="button"
              onClick={() => handleDelta(1)}
              disabled={isSubmitting}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => handleDelta(5)}
              disabled={isSubmitting}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +5
            </button>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
            <button
              type="button"
              onClick={() => setCount(0)}
              disabled={count === 0 || isSubmitting}
              className="px-2.5 py-1 text-xs font-medium rounded bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Stop All (0)
            </button>
            <button
              type="button"
              onClick={() => setCount(currentCount)}
              disabled={isUnchanged || isSubmitting}
              className="px-2.5 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Change Impact Preview */}
        <div>
          {diff > 0 && (
            <div className="p-3.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-lg flex items-center gap-2.5 text-sm text-green-800 dark:text-green-300">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span>
                <strong>Scale Up:</strong> Nomad will place <strong>+{diff}</strong> new{' '}
                {diff === 1 ? 'allocation' : 'allocations'} for <em>{taskGroup.Name}</em>.
              </span>
            </div>
          )}

          {diff < 0 && count > 0 && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg flex items-center gap-2.5 text-sm text-amber-800 dark:text-amber-300">
              <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>
                <strong>Scale Down:</strong> Nomad will stop <strong>{Math.abs(diff)}</strong> running{' '}
                {Math.abs(diff) === 1 ? 'allocation' : 'allocations'} for <em>{taskGroup.Name}</em>.
              </span>
            </div>
          )}

          {count === 0 && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg flex items-start gap-2.5 text-sm text-red-800 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Scale to Zero:</strong> All allocations for <em>{taskGroup.Name}</em> will be stopped.
              </div>
            </div>
          )}

          {isUnchanged && (
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-lg text-sm text-gray-500 dark:text-gray-400 text-center">
              Desired count is unchanged ({currentCount}).
            </div>
          )}
        </div>

        {/* Optional Message */}
        <div className="space-y-1">
          <label
            htmlFor="scale-message"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Reason / Message <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="scale-message"
            type="text"
            placeholder="e.g. Scaling up for high traffic"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSubmitting}
            className="block w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Modal actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={!isValidCount || isUnchanged || isSubmitting}
            isLoading={isSubmitting}
          >
            {isUnchanged ? 'No Change' : `Scale to ${count}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
