import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Code, List } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';
import { NomadVariable, NomadVariableInput } from '../../types/variables';
import { NomadNamespace } from '../../types/nomad';

interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  isSecretHidden: boolean;
}

interface VariableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (variable: NomadVariableInput) => Promise<void>;
  initialVariable?: NomadVariable | null;
  namespaces: NomadNamespace[];
  currentNamespace: string;
}

export const VariableModal: React.FC<VariableModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialVariable,
  namespaces,
  currentNamespace,
}) => {
  const isEditMode = Boolean(initialVariable);

  const [path, setPath] = useState('');
  const [namespace, setNamespace] = useState(currentNamespace || 'default');
  const [items, setItems] = useState<KeyValueItem[]>([]);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialVariable) {
        setPath(initialVariable.Path);
        setNamespace(initialVariable.Namespace || currentNamespace || 'default');
        const initialItems: KeyValueItem[] = Object.entries(initialVariable.Items || {}).map(
          ([key, value], idx) => ({
            id: `item-${idx}-${Date.now()}`,
            key,
            value: String(value),
            isSecretHidden: true,
          })
        );
        setItems(initialItems.length > 0 ? initialItems : [{ id: `item-0`, key: '', value: '', isSecretHidden: true }]);
        setJsonText(JSON.stringify(initialVariable.Items || {}, null, 2));
      } else {
        setPath('');
        setNamespace(currentNamespace && currentNamespace !== '*' ? currentNamespace : 'default');
        setItems([{ id: `item-0`, key: '', value: '', isSecretHidden: true }]);
        setJsonText('{}');
      }
      setJsonMode(false);
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, initialVariable, currentNamespace]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}-${Math.random()}`, key: '', value: '', isSecretHidden: true },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: 'key' | 'value', val: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const toggleItemVisibility = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isSecretHidden: !item.isSecretHidden } : item))
    );
  };

  const handleSwitchToJson = () => {
    const obj: Record<string, string> = {};
    for (const item of items) {
      const k = item.key.trim();
      if (k) {
        obj[k] = item.value;
      }
    }
    setJsonText(JSON.stringify(obj, null, 2));
    setJsonMode(true);
    setError(null);
  };

  const handleSwitchToForm = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setError('JSON must be an object with key-value string pairs.');
        return;
      }
      const newItems: KeyValueItem[] = Object.entries(parsed).map(([key, value], idx) => ({
        id: `item-${idx}-${Date.now()}`,
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        isSecretHidden: true,
      }));
      setItems(newItems.length > 0 ? newItems : [{ id: `item-0`, key: '', value: '', isSecretHidden: true }]);
      setJsonMode(false);
      setError(null);
    } catch {
      setError('Invalid JSON syntax. Please fix before switching views.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPath = path.trim().replace(/^\/+/, '');
    if (!cleanPath) {
      setError('Variable path is required (e.g. "nomad/jobs/my-app" or "services/auth").');
      return;
    }

    let finalItems: Record<string, string> = {};

    if (jsonMode) {
      try {
        const parsed = JSON.parse(jsonText);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setError('JSON must be an object with key-value string pairs.');
          return;
        }
        for (const [k, v] of Object.entries(parsed)) {
          finalItems[k] = typeof v === 'string' ? v : JSON.stringify(v);
        }
      } catch {
        setError('Invalid JSON syntax.');
        return;
      }
    } else {
      for (const item of items) {
        const k = item.key.trim();
        if (k) {
          finalItems[k] = item.value;
        }
      }
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave({
        Path: cleanPath,
        Namespace: namespace,
        Items: finalItems,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save variable');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Edit Variable: ${initialVariable?.Path}` : 'Create Variable'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && <ErrorAlert message={error} />}

          {/* Path and Namespace */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="var-path"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Variable Path <span className="text-red-500">*</span>
              </label>
              <input
                id="var-path"
                type="text"
                required
                disabled={isEditMode}
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="e.g. nomad/jobs/api or config/database"
                className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Hierarchical path used by workloads to read configuration.
              </p>
            </div>

            <div>
              <label
                htmlFor="var-namespace"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Namespace <span className="text-red-500">*</span>
              </label>
              <select
                id="var-namespace"
                disabled={isEditMode}
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {namespaces.map((ns) => (
                  <option key={ns.Name} value={ns.Name}>
                    {ns.Name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items Header & Mode Toggle */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Variable Keys & Values ({jsonMode ? 'JSON Mode' : `${items.length} items`})
            </span>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                type="button"
                onClick={handleSwitchToForm}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  !jsonMode
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Form</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchToJson}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  jsonMode
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Form Mode */}
          {!jsonMode && (
            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700"
                >
                  <div className="w-1/3 min-w-[120px]">
                    <input
                      type="text"
                      value={item.key}
                      onChange={(e) => handleItemChange(item.id, 'key', e.target.value)}
                      placeholder={`KEY_${idx + 1}`}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex-1 relative">
                    <input
                      type={item.isSecretHidden ? 'password' : 'text'}
                      value={item.value}
                      onChange={(e) => handleItemChange(item.id, 'value', e.target.value)}
                      placeholder="Value"
                      className="w-full pl-2.5 pr-8 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleItemVisibility(item.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      title={item.isSecretHidden ? 'Show value' : 'Hide value'}
                    >
                      {item.isSecretHidden ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none rounded transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddItem}
                className="mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Key-Value
              </Button>
            </div>
          )}

          {/* JSON Mode */}
          {jsonMode && (
            <div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={10}
                className="w-full p-3 font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder='{ "KEY": "value" }'
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter valid JSON object where all keys map to string values.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {isEditMode ? 'Update Variable' : 'Create Variable'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default VariableModal;
