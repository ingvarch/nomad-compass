import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal, Button, ErrorAlert } from '../ui';
import { getErrorMessage } from '../../lib/errors';
import { formatBytes } from '../../lib/utils/formatBytes';
import { inputStyles, labelStyles } from '../../lib/styles';
import type { NomadCSISnapshot } from '../../types/csi';

interface SnapshotModalProps {
  volumeId: string;
  onClose: () => void;
  onSnapshot: (name: string) => Promise<NomadCSISnapshot>;
}

/**
 * Asks for a snapshot name, then shows the snapshot the plugin made.
 */
export function SnapshotModal({ volumeId, onClose, onSnapshot }: SnapshotModalProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<NomadCSISnapshot | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      setSnapshot(await onSnapshot(name.trim()));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create snapshot', 'snapshot-volume'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Snapshot Volume: ${volumeId}`} size="md">
      {snapshot ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-lg">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" />
            <dl className="min-w-0 space-y-1 text-sm text-green-800 dark:text-green-300">
              <div className="flex gap-2">
                <dt>Snapshot</dt>
                <dd className="font-mono break-all">{snapshot.ID}</dd>
              </div>
              <div className="flex gap-2">
                <dt>Size</dt>
                <dd>{formatBytes(snapshot.SizeBytes)}</dd>
              </div>
              <dd>{snapshot.IsReady ? 'Ready' : 'Not ready yet; the plugin is still taking it'}</dd>
            </dl>
          </div>
          <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorAlert message={error} />}
          <div>
            <label htmlFor="snapshot-name" className={labelStyles}>
              Snapshot name
            </label>
            <input
              id="snapshot-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="before-upgrade"
              disabled={isSubmitting}
              className={inputStyles}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The plugin may use the name or pick its own ID.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Snapshot
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
