import { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../lib/errors';

interface UseCrudTabOptions<T, TCreate, TEdit> {
  /** Function to fetch initial data */
  fetchData: () => Promise<T[]>;
  /** Function to delete an item by its identifier */
  deleteItem: (item: TEdit) => Promise<void>;
  /** Get display name for deleted item in toast */
  getDeletedItemName: (item: TEdit) => string;
  /** Error message prefix for fetch errors */
  fetchErrorMessage?: string;
  /** Error message prefix for delete errors */
  deleteErrorMessage?: string;
}

interface UseCrudTabResult<T, TCreate, TEdit> {
  // Data state
  items: T[];
  loading: boolean;
  error: string | null;

  // Modal states
  showCreateModal: boolean;
  editingItem: TEdit | null;
  deletingItem: TEdit | null;
  deleteLoading: boolean;

  // Actions
  refetch: () => Promise<void>;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (item: TEdit) => void;
  closeEditModal: () => void;
  openDeleteConfirm: (item: TEdit) => void;
  closeDeleteConfirm: () => void;
  handleDelete: () => Promise<void>;
  onCreateSuccess: (message: string) => Promise<void>;
  onEditSuccess: (message: string) => Promise<void>;
}

/**
 * Generic hook for CRUD tab operations.
 * Consolidates the common pattern of loading data, showing modals, and handling delete.
 */
export function useCrudTab<T, TCreate = unknown, TEdit = T>({
  fetchData,
  deleteItem,
  getDeletedItemName,
  fetchErrorMessage = 'Failed to fetch data',
  deleteErrorMessage = 'Failed to delete item',
}: UseCrudTabOptions<T, TCreate, TEdit>): UseCrudTabResult<T, TCreate, TEdit> {
  const { addToast } = useToast();

  // Data state
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TEdit | null>(null);
  const [deletingItem, setDeletingItem] = useState<TEdit | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch data
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchData();
      setItems(data || []);
    } catch (err) {
      setError(getErrorMessage(err, fetchErrorMessage));
    } finally {
      setLoading(false);
    }
  }, [fetchData, fetchErrorMessage]);

  // Modal actions
  const openCreateModal = useCallback(() => setShowCreateModal(true), []);
  const closeCreateModal = useCallback(() => setShowCreateModal(false), []);
  const openEditModal = useCallback((item: TEdit) => setEditingItem(item), []);
  const closeEditModal = useCallback(() => setEditingItem(null), []);
  const openDeleteConfirm = useCallback((item: TEdit) => setDeletingItem(item), []);
  const closeDeleteConfirm = useCallback(() => setDeletingItem(null), []);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletingItem) return;

    setDeleteLoading(true);
    try {
      await deleteItem(deletingItem);
      addToast(`${getDeletedItemName(deletingItem)} deleted successfully`, 'success');
      setDeletingItem(null);
      await refetch();
    } catch (err) {
      addToast(getErrorMessage(err, deleteErrorMessage), 'error');
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingItem, deleteItem, getDeletedItemName, addToast, deleteErrorMessage, refetch]);

  // Success handlers for create/edit
  const onCreateSuccess = useCallback(async (message: string) => {
    addToast(message, 'success');
    setShowCreateModal(false);
    await refetch();
  }, [addToast, refetch]);

  const onEditSuccess = useCallback(async (message: string) => {
    addToast(message, 'success');
    setEditingItem(null);
    await refetch();
  }, [addToast, refetch]);

  return {
    items,
    loading,
    error,
    showCreateModal,
    editingItem,
    deletingItem,
    deleteLoading,
    refetch,
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    onCreateSuccess,
    onEditSuccess,
  };
}
