import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { MoreVertical, Terminal, RotateCcw, RefreshCw, Radio, Square, FolderOpen, type LucideIcon } from 'lucide-react';
import type { NomadAllocation } from '../../types/nomad';
import { createNomadClient, type NomadClient } from '../../lib/api/nomad';
import { filesPagePath } from '../../lib/services/allocFilesService';
import { useToast } from '../../context/ToastContext';
import { isPermissionError, getPermissionErrorMessage, getErrorMessage } from '../../lib/errors';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import PermissionErrorModal from '../ui/PermissionErrorModal';
import { TaskSignalModal } from './TaskSignalModal';
import { RestartAllocationModal } from './RestartAllocationModal';

interface AllocationActionsDropdownProps {
  allocation: NomadAllocation;
  onSuccess?: () => void | Promise<void>;
}

type AllocationAction = 'restart' | 'signal' | 'stop' | 'reschedule';

const ACTIONS: Record<AllocationAction, { label: string; icon: LucideIcon; failure: string; danger?: boolean }> = {
  restart: { label: 'Restart Allocation...', icon: RotateCcw, failure: 'Failed to restart allocation' },
  signal: { label: 'Send Signal...', icon: Radio, failure: 'Failed to send signal to task' },
  stop: { label: 'Stop Allocation', icon: Square, failure: 'Failed to stop allocation', danger: true },
  reschedule: {
    label: 'Reschedule Failed Allocations',
    icon: RefreshCw,
    failure: 'Failed to reschedule failed allocations',
  },
};

const menuItemBase = 'flex items-center w-full px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs text-left';
const menuItemStyles = `${menuItemBase} text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700`;
const menuItemDangerStyles = `${menuItemBase} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`;

// Nomad restarts and signals only running tasks, stops only live allocations
// and reschedules only failed ones
function availableActions(allocation: NomadAllocation): AllocationAction[] {
  switch (allocation.ClientStatus) {
    case 'running':
      return ['restart', 'signal', 'stop'];
    case 'pending':
    case 'unknown':
      return ['stop'];
    case 'failed':
      return ['reschedule'];
    default:
      return [];
  }
}

// The directory exists once the allocation started and until garbage collection; a lost node takes it along
function hasFiles(allocation: NomadAllocation): boolean {
  return ['running', 'complete', 'failed'].includes(allocation.ClientStatus);
}

function getFirstTask(alloc: NomadAllocation): string | null {
  if (alloc.TaskStates) {
    const tasks = Object.keys(alloc.TaskStates);
    if (tasks.length > 0) return tasks[0];
  }
  return null;
}

export function AllocationActionsDropdown({
  allocation,
  onSuccess,
}: AllocationActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  // Modals state
  const [openAction, setOpenAction] = useState<AllocationAction | null>(null);
  const [stopNoShutdownDelay, setStopNoShutdownDelay] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const { addToast } = useToast();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const firstTask = getFirstTask(allocation);
  const isRunning = allocation.ClientStatus === 'running';
  const actions = availableActions(allocation);
  const canBrowseFiles = hasFiles(allocation);
  const closeDialog = () => setOpenAction(null);

  // Toggle menu and calculate fixed position
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: (rect.bottom || 0) + 4,
        right: Math.max(8, window.innerWidth - (rect.right || 0)),
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Close on scroll or resize
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => setIsOpen(false);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Action handlers
  const runAction = async (
    action: AllocationAction,
    request: (client: NomadClient) => Promise<unknown>,
    successMessage: string
  ) => {
    setIsLoading(true);
    try {
      await request(createNomadClient());
      addToast(successMessage, 'success');
      closeDialog();
      await onSuccess?.();
    } catch (err) {
      if (isPermissionError(err)) {
        closeDialog();
        setPermissionError(getPermissionErrorMessage(`${action}-allocation`));
      } else {
        addToast(getErrorMessage(err, ACTIONS[action].failure), 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = (taskName?: string) =>
    runAction(
      'restart',
      (client) => client.restartAllocation(allocation.ID, taskName, allocation.Namespace),
      taskName ? `Task "${taskName}" restart initiated` : 'Allocation restart initiated'
    );

  const handleSignal = (task: string, signal: string) =>
    runAction(
      'signal',
      (client) => client.signalTask(allocation.ID, task, signal, allocation.Namespace),
      `Signal ${signal} sent to task "${task}"`
    );

  const handleStop = () =>
    runAction(
      'stop',
      (client) =>
        client.stopAllocation(
          allocation.ID,
          // Like `nomad alloc stop`: Nomad replaces a stopped batch allocation only when asked
          { noShutdownDelay: stopNoShutdownDelay, reschedule: allocation.JobType === 'batch' },
          allocation.Namespace
        ),
      'Allocation stop requested'
    );

  const handleReschedule = () =>
    runAction(
      'reschedule',
      (client) => client.rescheduleFailedAllocations(allocation.JobID, allocation.Namespace),
      `Reschedule of failed allocations of "${allocation.JobID}" requested`
    );

  return (
    <>
      <div className="inline-flex items-center gap-1.5 justify-end">
        {isRunning && firstTask && (
          <Link
            to={`/exec/${allocation.ID}/${firstTask}?namespace=${allocation.Namespace}`}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Open terminal"
            onClick={(e) => e.stopPropagation()}
          >
            <Terminal className="w-3.5 h-3.5" />
            Exec
          </Link>
        )}

        {(canBrowseFiles || actions.length > 0) && (
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleMenu}
            className="inline-flex items-center justify-center w-11 h-11 sm:w-7 sm:h-7 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Allocation actions"
            aria-label="Allocation actions"
            aria-haspopup="menu"
            aria-expanded={isOpen}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: menuPos?.top ?? 0,
              right: menuPos?.right ?? 8,
            }}
            className="z-50 w-60 sm:w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-1"
            onClick={(e) => e.stopPropagation()}
          >
            {canBrowseFiles && (
              <Link
                role="menuitem"
                to={filesPagePath(allocation.ID, '/')}
                onClick={() => setIsOpen(false)}
                className={menuItemStyles}
              >
                <FolderOpen className="w-3.5 h-3.5 mr-2 text-gray-500" />
                Browse Files
              </Link>
            )}
            {actions.map((action) => {
              const { label, icon: Icon, danger } = ACTIONS[action];
              return (
                <button
                  key={action}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    setOpenAction(action);
                  }}
                  className={danger ? menuItemDangerStyles : menuItemStyles}
                >
                  <Icon className={`w-3.5 h-3.5 mr-2 ${danger ? 'text-red-500' : 'text-gray-500'}`} />
                  {label}
                </button>
              );
            })}
          </div>,
          document.body
        )}

      {/* Dialogs go to the body: inside a table cell they inherit its alignment and nowrap */}
      {createPortal(
        <>
          {/* Restart Modal */}
          {openAction === 'restart' && (
            <RestartAllocationModal
              isOpen
              allocation={allocation}
              onClose={closeDialog}
              onConfirm={handleRestart}
              isLoading={isLoading}
            />
          )}

          {/* Signal Modal */}
          {openAction === 'signal' && (
            <TaskSignalModal
              isOpen
              allocation={allocation}
              onClose={closeDialog}
              onConfirm={handleSignal}
              isLoading={isLoading}
            />
          )}

          {/* Reschedule Confirmation Dialog */}
          {openAction === 'reschedule' && (
            <ConfirmationDialog
              isOpen
              onClose={closeDialog}
              onConfirm={handleReschedule}
              title="Reschedule Failed Allocations"
              message={
                <div className="space-y-2">
                  <p>
                    Reschedule the failed allocations of job{' '}
                    <span className="font-mono font-medium">{allocation.JobID}</span>?
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nomad is asked to place them again now, including the ones past their reschedule limit.
                  </p>
                </div>
              }
              mode="confirm"
              confirmLabel="Reschedule"
              isLoading={isLoading}
            />
          )}

          {/* Stop Confirmation Dialog */}
          {openAction === 'stop' && (
            <ConfirmationDialog
              isOpen
              onClose={closeDialog}
              onConfirm={handleStop}
              title="Stop Allocation"
              message={
                <div className="space-y-3">
                  <p>
                    Are you sure you want to stop allocation{' '}
                    <span className="font-mono font-medium">{allocation.ID.slice(0, 8)}</span>?
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Running tasks will be terminated. If the job is still running, Nomad schedules a replacement, which may land on another node.
                  </p>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={stopNoShutdownDelay}
                      onChange={(e) => setStopNoShutdownDelay(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 h-4 w-4"
                    />
                    <span>No shutdown delay</span>
                  </label>
                </div>
              }
              mode="delete"
              confirmLabel="Stop Allocation"
              isLoading={isLoading}
            />
          )}

          {/* Permission Error Modal */}
          {permissionError && (
            <PermissionErrorModal
              isOpen
              onClose={() => setPermissionError(null)}
              message={permissionError}
            />
          )}
        </>,
        document.body
      )}
    </>
  );
}
