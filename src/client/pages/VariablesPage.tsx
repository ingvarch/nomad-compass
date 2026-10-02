import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  KeyRound,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  FolderLock,
  Layers,
} from 'lucide-react';
import { createNomadClient } from '../lib/api/nomad';
import { getErrorMessage } from '../lib/errors';
import { NomadVariable, NomadVariableMetadata, NomadVariableInput } from '../types/variables';
import { NomadNamespace } from '../types/nomad';
import {
  PageHeader,
  Button,
  DataTable,
  Badge,
  LoadingSpinner,
  ErrorAlert,
  ConfirmationDialog,
  Select,
  type Column,
} from '../components/ui';
import { VariableModal } from '../components/variables/VariableModal';
import { VariableDetailModal } from '../components/variables/VariableDetailModal';
import { formatTimeAgo } from '../lib/utils/dateFormatter';
import { useToast } from '../context/ToastContext';

export default function VariablesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedNamespace = searchParams.get('namespace') || '*';

  const [variables, setVariables] = useState<NomadVariableMetadata[]>([]);
  const [namespaces, setNamespaces] = useState<NomadNamespace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<NomadVariable | null>(null);
  const [viewingVariable, setViewingVariable] = useState<NomadVariable | null>(null);
  const [deletingVariable, setDeletingVariable] = useState<NomadVariableMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    const client = createNomadClient();
    try {
      setLoading(true);
      setError(null);

      const [namespacesData, varsData] = await Promise.all([
        client.getNamespaces().catch(() => []),
        client.getVariables(selectedNamespace === '*' ? undefined : selectedNamespace),
      ]);

      setNamespaces(namespacesData);
      setVariables(varsData || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch Nomad variables'));
    } finally {
      setLoading(false);
    }
  }, [selectedNamespace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNamespaceChange = (ns: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (ns === '*') {
      nextParams.delete('namespace');
    } else {
      nextParams.set('namespace', ns);
    }
    setSearchParams(nextParams);
  };

  const handleView = async (v: NomadVariableMetadata) => {
    const client = createNomadClient();
    try {
      const fullVar = await client.getVariable(v.Path, v.Namespace);
      setViewingVariable(fullVar);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  };

  const handleEdit = async (v: NomadVariableMetadata | NomadVariable) => {
    const client = createNomadClient();
    try {
      // If items not yet loaded, load full variable
      let fullVar: NomadVariable;
      if ('Items' in v && v.Items) {
        fullVar = v as NomadVariable;
      } else {
        fullVar = await client.getVariable(v.Path, v.Namespace);
      }
      setEditingVariable(fullVar);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  };

  const handleSaveVariable = async (varInput: NomadVariableInput) => {
    const client = createNomadClient();
    await client.putVariable(varInput);
    addToast(`Variable ${varInput.Path} saved successfully`, 'success');
    fetchData();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVariable) return;
    const client = createNomadClient();
    try {
      setIsDeleting(true);
      await client.deleteVariable(deletingVariable.Path, deletingVariable.Namespace);
      addToast(`Variable ${deletingVariable.Path} deleted`, 'success');
      setDeletingVariable(null);
      if (viewingVariable?.Path === deletingVariable.Path) {
        setViewingVariable(null);
      }
      fetchData();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered variables by search
  const filteredVariables = useMemo(() => {
    if (!searchQuery.trim()) return variables;
    const q = searchQuery.toLowerCase();
    return variables.filter(
      (v) =>
        v.Path.toLowerCase().includes(q) ||
        (v.Namespace && v.Namespace.toLowerCase().includes(q))
    );
  }, [variables, searchQuery]);

  const columns: Column<NomadVariableMetadata>[] = [
    {
      key: 'Path',
      header: 'Path',
      render: (v) => (
        <button
          type="button"
          onClick={() => handleView(v)}
          className="flex items-center gap-2 font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline text-left"
        >
          <KeyRound className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="truncate max-w-md">{v.Path}</span>
        </button>
      ),
    },
    {
      key: 'Namespace',
      header: 'Namespace',
      render: (v) => (
        <Badge variant="blue" size="sm">
          {v.Namespace || 'default'}
        </Badge>
      ),
    },
    {
      key: 'ModifyIndex',
      header: 'Modify Index',
      render: (v) => <span className="text-xs font-mono text-gray-500">{v.ModifyIndex}</span>,
    },
    {
      key: 'ModifyTime',
      header: 'Last Modified',
      render: (v) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {v.ModifyTime ? formatTimeAgo(v.ModifyTime) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (v) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleView(v)}
            className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"
            title="View variable"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleEdit(v)}
            className="p-1.5 text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-md transition-colors"
            title="Edit variable"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingVariable(v)}
            className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors"
            title="Delete variable"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Variables & Secrets"
        description="Encrypted K/V configuration store for workloads running in your Nomad cluster"
        actions={
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create Variable
          </Button>
        }
      />

      {error && <ErrorAlert message={error} />}

      {/* Control bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Namespace Filter */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-400 shrink-0" />
            <Select
              aria-label="Filter by namespace"
              value={selectedNamespace}
              onChange={handleNamespaceChange}
              options={[
                { value: '*', label: 'All Namespaces' },
                ...namespaces.map((ns) => ({ value: ns.Name, label: ns.Name })),
              ]}
              className="min-w-[160px]"
            />
          </div>

          {/* Search Filter */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search variables by path..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Total: <strong>{variables.length}</strong>
          </span>
          {searchQuery && (
            <span>
              Matching: <strong>{filteredVariables.length}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Main Table / Mobile Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <DataTable
            items={filteredVariables}
            columns={columns}
            keyExtractor={(v) => `${v.Namespace || 'default'}/${v.Path}`}
            emptyState={{
              message: searchQuery
                ? `No variables match "${searchQuery}"`
                : selectedNamespace !== '*'
                ? `No variables found in namespace "${selectedNamespace}". Create your first variable to store secrets or configuration.`
                : 'No variables stored in this Nomad cluster yet.',
            }}
            mobileCardRenderer={(v) => (
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleView(v)}
                    className="flex items-center gap-2 font-mono text-sm font-bold text-blue-600 dark:text-blue-400 text-left hover:underline break-all"
                  >
                    <KeyRound className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{v.Path}</span>
                  </button>
                  <Badge variant="blue" size="sm">
                    {v.Namespace || 'default'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                  <span>Mod: {v.ModifyTime ? formatTimeAgo(v.ModifyTime) : '—'}</span>
                  <span>Index: {v.ModifyIndex}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                  <Button variant="secondary" size="sm" onClick={() => handleView(v)}>
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(v)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeletingVariable(v)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* Create Modal */}
      <VariableModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveVariable}
        namespaces={namespaces}
        currentNamespace={selectedNamespace === '*' ? 'default' : selectedNamespace}
      />

      {/* Edit Modal */}
      <VariableModal
        isOpen={Boolean(editingVariable)}
        onClose={() => setEditingVariable(null)}
        onSave={handleSaveVariable}
        initialVariable={editingVariable}
        namespaces={namespaces}
        currentNamespace={editingVariable?.Namespace || 'default'}
      />

      {/* View Detail Modal */}
      <VariableDetailModal
        isOpen={Boolean(viewingVariable)}
        onClose={() => setViewingVariable(null)}
        variable={viewingVariable}
        onEdit={(v) => handleEdit(v)}
        onDelete={(v) => setDeletingVariable(v)}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(deletingVariable)}
        onClose={() => setDeletingVariable(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Variable"
        mode="delete"
        confirmLabel="Delete Variable"
        isLoading={isDeleting}
        message={
          <div>
            Are you sure you want to delete variable{' '}
            <strong className="font-mono text-gray-900 dark:text-white">
              {deletingVariable?.Path}
            </strong>{' '}
            in namespace{' '}
            <strong className="font-mono text-gray-900 dark:text-white">
              {deletingVariable?.Namespace || 'default'}
            </strong>
            ? This action cannot be undone and any tasks relying on this variable may fail.
          </div>
        }
      />
    </div>
  );
}
