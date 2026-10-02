import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Check, Pencil, Trash2, KeyRound } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NomadVariable } from '../../types/variables';
import { formatDateLongZoned } from '../../lib/utils/dateFormatter';

interface VariableDetailModalProps {
  variable: NomadVariable | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (variable: NomadVariable) => void;
  onDelete: (variable: NomadVariable) => void;
}

export const VariableDetailModal: React.FC<VariableDetailModalProps> = ({
  variable,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!variable) return null;

  const items = variable.Items || {};
  const entries = Object.entries(items);
  const allRevealed = entries.length > 0 && entries.every(([k]) => revealedKeys[k]);

  const toggleAll = () => {
    if (allRevealed) {
      setRevealedKeys({});
    } else {
      const next: Record<string, boolean> = {};
      entries.forEach(([k]) => {
        next[k] = true;
      });
      setRevealedKeys(next);
    }
  };

  const toggleSingle = (key: string) => {
    setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Variable: ${variable.Path}`} size="xl">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Metadata Banner */}
        <div className="p-5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-500 shrink-0" />
              <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white break-all">
                {variable.Path}
              </span>
              {variable.Namespace && (
                <Badge variant="blue" size="sm">
                  {variable.Namespace}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(variable);
                }}
              >
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onClose();
                  onDelete(variable);
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500 dark:text-gray-400 pt-1">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Modified: </span>
              {variable.ModifyTime ? formatDateLongZoned(variable.ModifyTime) : 'Unknown'}
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Modify Index: </span>
              {variable.ModifyIndex}
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Create Index: </span>
              {variable.CreateIndex}
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Items: </span>
              {entries.length}
            </div>
          </div>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Keys & Values
            </span>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
              >
                {allRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{allRevealed ? 'Hide All Values' : 'Reveal All Values'}</span>
              </button>
            )}
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
              This variable does not contain any key-value items.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
              {entries.map(([key, val]) => {
                const isRevealed = Boolean(revealedKeys[key]);
                const isCopied = copiedKey === key;

                return (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="sm:w-1/3 min-w-0 pr-2">
                      <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200 break-all select-all">
                        {key}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center justify-between gap-2 min-w-0 bg-gray-50 dark:bg-gray-900/60 p-2 rounded border border-gray-200/60 dark:border-gray-700/60">
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all select-all">
                        {isRevealed ? String(val) : '••••••••••••••••'}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleSingle(key)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
                          title={isRevealed ? 'Hide value' : 'Show value'}
                        >
                          {isRevealed ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(key, String(val))}
                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                          title="Copy value"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VariableDetailModal;
