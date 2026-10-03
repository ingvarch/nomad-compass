import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Folders,
  Database,
  HardDrive,
  Boxes,
  AlertTriangle,
  Shield,
  Moon,
  Sun,
  LogOut,
  X,
  Lock,
  LockOpen,
  ChevronRight,
  Download,
  KeyRound,
  Layers,
  Cylinder,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { parseNomadAddr } from '../../lib/utils/nomadAddr';

interface MoreMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  nomadAddr: string | null;
  onLogout: () => void;
  hasManagementAccess?: boolean;
}

const ThemeRow: React.FC = () => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-monokai-text">
        <div className="flex items-center gap-3">
          <Moon className="w-5 h-5 text-gray-500 dark:text-monokai-muted" />
          <span>Appearance</span>
        </div>
        <span className="text-xs font-semibold capitalize px-2 py-1 rounded bg-gray-100 dark:bg-monokai-surface text-gray-600 dark:text-monokai-muted">
          ...
        </span>
      </div>
    );
  }

  return <ThemeRowClient />;
};

const ThemeRowClient: React.FC = () => {
  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-monokai-text dark:hover:bg-monokai-surface transition-colors"
    >
      <div className="flex items-center gap-3">
        {effectiveTheme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-500 dark:text-monokai-muted" />
        )}
        <span>Appearance</span>
      </div>
      <span className="text-xs font-semibold capitalize px-2 py-1 rounded bg-gray-100 dark:bg-monokai-surface text-gray-600 dark:text-monokai-muted">
        {effectiveTheme}
      </span>
    </button>
  );
};

export const MoreMenuSheet: React.FC<MoreMenuSheetProps> = ({
  isOpen,
  onClose,
  nomadAddr,
  onLogout,
  hasManagementAccess = false,
}) => {
  const location = useLocation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { hasDeferredPrompt, promptInstall } = usePwaInstall();

  // Gesture state for swipe-down dismissal
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);
  const currentDragOffset = useRef(0);
  const isHandleDrag = useRef(false);

  const contentStartY = useRef(0);
  const isContentDragging = useRef(false);

  // Reset enter animation state on open
  useEffect(() => {
    if (isOpen) {
      setHasEntered(false);
      setDragOffset(0);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle drag for handle & header
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartTime.current = Date.now();
    currentDragOffset.current = 0;
    isHandleDrag.current = true;
    setIsDragging(true);
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isHandleDrag.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY.current;
    if (deltaY > 0) {
      currentDragOffset.current = deltaY;
      setDragOffset(deltaY);
    } else {
      const damped = deltaY * 0.15;
      currentDragOffset.current = damped;
      setDragOffset(damped);
    }
  };

  const handleDragEnd = useCallback(() => {
    if (!isHandleDrag.current) return;
    isHandleDrag.current = false;
    setIsDragging(false);

    const elapsed = Date.now() - dragStartTime.current;
    const offset = currentDragOffset.current;
    const velocity = offset / Math.max(elapsed, 1);

    if (offset > 90 || (offset > 30 && velocity > 0.4)) {
      setDragOffset(0);
      onClose();
    } else {
      setDragOffset(0);
    }
  }, [onClose]);

  // Handle swipe-down from content when at top
  const handleContentTouchStart = (e: React.TouchEvent) => {
    contentStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    currentDragOffset.current = 0;
    isContentDragging.current = false;
  };

  const handleContentTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - contentStartY.current;
    const scrollTop = contentRef.current?.scrollTop ?? 0;

    if (scrollTop <= 0 && deltaY > 0) {
      isContentDragging.current = true;
      setIsDragging(true);
      currentDragOffset.current = deltaY;
      setDragOffset(deltaY);
    }
  };

  const handleContentTouchEnd = () => {
    if (isContentDragging.current) {
      isContentDragging.current = false;
      setIsDragging(false);

      const elapsed = Date.now() - dragStartTime.current;
      const offset = currentDragOffset.current;
      const velocity = offset / Math.max(elapsed, 1);

      if (offset > 90 || (offset > 30 && velocity > 0.4)) {
        setDragOffset(0);
        onClose();
      } else {
        setDragOffset(0);
      }
    }
  };

  // Mouse drag support for desktop/testing
  useEffect(() => {
    if (!isDragging || !isHandleDrag.current) return;

    const onMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartY.current;
      if (deltaY > 0) {
        currentDragOffset.current = deltaY;
        setDragOffset(deltaY);
      } else {
        const damped = deltaY * 0.15;
        currentDragOffset.current = damped;
        setDragOffset(damped);
      }
    };

    const onMouseUp = () => {
      if (isHandleDrag.current) {
        handleDragEnd();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleDragEnd]);

  if (!isOpen) return null;

  const parsed = nomadAddr ? parseNomadAddr(nomadAddr) : null;

  const handleLinkClick = () => {
    onClose();
  };

  const isCurrent = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div
      className="fixed inset-0 z-50 sm:hidden flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="more-menu-title"
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200 ${
          !hasEntered ? 'animate-backdrop-fade-in' : ''
        }`}
        style={{
          opacity: dragOffset > 0 ? Math.max(0, 1 - dragOffset / 350) : 1,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        ref={sheetRef}
        className={`relative z-10 w-full max-h-[85vh] bg-white dark:bg-monokai-bg rounded-t-[28px] shadow-2xl border-t border-gray-200/80 dark:border-monokai-surface/80 flex flex-col overflow-hidden pb-safe pl-safe pr-safe ${
          !hasEntered && !isDragging ? 'animate-sheet-slide-up' : ''
        }`}
        style={{
          transform: `translate3d(0, ${Math.max(0, dragOffset)}px, 0)`,
          transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
        onAnimationEnd={() => setHasEntered(true)}
      >
        {/* Apple HIG Drag Handle / Grabber */}
        <div
          data-testid="sheet-drag-handle"
          className="pt-3 pb-2 flex justify-center items-center cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onTouchCancel={handleDragEnd}
          onMouseDown={handleDragStart}
        >
          <div className="w-9 h-1.25 rounded-full bg-gray-300 dark:bg-monokai-surface" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 dark:border-monokai-surface touch-none select-none"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onTouchCancel={handleDragEnd}
          onMouseDown={handleDragStart}
        >
          <div>
            <h2 id="more-menu-title" className="text-[17px] font-semibold text-gray-900 dark:text-monokai-text tracking-tight">
              Cluster & Menu
            </h2>
            {parsed && (
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-monokai-muted">
                {parsed.isSecure ? (
                  <Lock className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <LockOpen className="w-3.5 h-3.5 text-orange-400" />
                )}
                <span className="truncate max-w-[220px] font-mono">{parsed.displayAddr}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-monokai-surface text-gray-500 hover:text-gray-700 dark:text-monokai-muted dark:hover:text-monokai-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          ref={contentRef}
          className="overflow-y-auto px-4 py-3 space-y-4"
          onTouchStart={handleContentTouchStart}
          onTouchMove={handleContentTouchMove}
          onTouchEnd={handleContentTouchEnd}
          onTouchCancel={handleContentTouchEnd}
        >
          {/* Section: Cluster Resources */}
          <div>
            <div className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-monokai-muted">
              Cluster Infrastructure
            </div>
            <div className="space-y-1">
              <Link
                to="/namespaces"
                onClick={handleLinkClick}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent('/namespaces')
                    ? 'bg-blue-50 text-blue-600 dark:bg-monokai-surface dark:text-monokai-blue'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-monokai-text dark:hover:bg-monokai-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Folders className="w-5 h-5 text-gray-500 dark:text-monokai-muted" />
                  <span>Namespaces</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-monokai-muted" />
              </Link>

              <Link
                to="/variables"
                onClick={handleLinkClick}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent('/variables')
                    ? 'bg-blue-50 text-blue-600 dark:bg-monokai-surface dark:text-monokai-blue'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-monokai-text dark:hover:bg-monokai-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <KeyRound className="w-5 h-5 text-gray-500 dark:text-monokai-muted" />
                  <span>Variables & Secrets</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-monokai-muted" />
              </Link>

              <Link
                to="/nodes"
                onClick={handleLinkClick}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent('/nodes')
                    ? 'bg-blue-50 text-blue-600 dark:bg-monokai-surface dark:text-monokai-blue'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-monokai-text dark:hover:bg-monokai-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-gray-500 dark:text-monokai-muted" />
                  <span>Nodes</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-monokai-muted" />
              </Link>

              <Link
                to="/node-pools"
                onClick={handleLinkClick}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent('/node-pools')
                    ? 'bg-blue-50 text-blue-600 dark:bg-monokai-surface dark:text-monokai-blue'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-monokai-text dark:hover:bg-monokai-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-gray-500 dark:text-monokai-muted" />
                  <span>Node Pools</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-monokai-muted" />
              </Link>

              <Link
                to="/storage"
                onClick={handleLinkClick}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent('/storage')
                    ? 'bg-blue-50 text-blue-600 dark:bg-monokai-surface dark:text-monokai-blue'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-monokai-text dark:hover:bg-monokai-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Cylinder className="w-5 h-5 text-gray-500 dark:text-monokai-muted" />
                  <span>Storage</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-monokai-muted" />
              </Link>

              <Link
                to="/servers"
                onClick={handleLinkClick}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent('/servers')
                    ? 'bg-blue-50 text-blue-600 dark:bg-monokai-surface dark:text-monokai-blue'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-monokai-text dark:hover:bg-monokai-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-gray-500 dark:text-monokai-muted" />
                  <span>Servers & Raft</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-monokai-muted" />
              </Link>
            </div>
          </div>

          {/* Section: Allocations & Health */}
          <div>
            <div className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-monokai-muted">
              Allocations & Health
            </div>
            <div className="space-y-1">
              <Link
                to="/allocations"
                onClick={handleLinkClick}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent('/allocations') && !location.pathname.includes('/failed')
                    ? 'bg-blue-50 text-blue-600 dark:bg-monokai-surface dark:text-monokai-blue'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-monokai-text dark:hover:bg-monokai-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Boxes className="w-5 h-5 text-gray-500 dark:text-monokai-muted" />
                  <span>All Allocations</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-monokai-muted" />
              </Link>

              <Link
                to="/allocations/failed"
                onClick={handleLinkClick}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isCurrent('/allocations/failed')
                    ? 'bg-red-50 text-red-600 dark:bg-monokai-surface dark:text-monokai-red'
                    : 'text-red-600 hover:bg-red-50 dark:text-monokai-red dark:hover:bg-monokai-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 dark:text-monokai-red" />
                  <span>Failed Allocations</span>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400 dark:text-monokai-muted" />
              </Link>
            </div>
          </div>

          {/* Section: Security / ACL */}
          {hasManagementAccess && (
            <div>
              <div className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-monokai-muted">
                Security & Access
              </div>
              <div className="space-y-1">
                <Link
                  to="/acl"
                  onClick={handleLinkClick}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isCurrent('/acl')
                      ? 'bg-blue-50 text-blue-600 dark:bg-monokai-surface dark:text-monokai-blue'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-monokai-text dark:hover:bg-monokai-surface'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-500 dark:text-monokai-muted" />
                    <span>ACL (Policies & Tokens)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-monokai-muted" />
                </Link>
              </div>
            </div>
          )}

          {/* Section: Preferences & Session */}
          <div className="pt-2 border-t border-gray-100 dark:border-monokai-surface">
            <div className="space-y-2">
              {/* Install App Button if browser prompt is available */}
              {hasDeferredPrompt && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    promptInstall();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-monokai-surface transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    <span>Install App</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400" />
                </button>
              )}

              {/* Theme Toggle Button */}
              <ThemeRow />

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:text-monokai-red dark:hover:bg-monokai-surface transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoreMenuSheet;
