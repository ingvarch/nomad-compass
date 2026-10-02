import React, { useState } from 'react';
import { RefreshCw, Download, Share, PlusSquare, X } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export const PwaInstallPrompt: React.FC = () => {
  const {
    canInstall,
    hasDeferredPrompt,
    isIos,
    hasUpdate,
    isInstallDismissed,
    promptInstall,
    dismissInstall,
    dismissUpdate,
    applyUpdate,
  } = usePwaInstall();

  const [showIosInstructions, setShowIosInstructions] = useState(false);

  return (
    <>
      {/* Service Worker Update Toast */}
      {hasUpdate && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-blue-600 dark:bg-blue-700 text-white p-3 rounded-xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 border border-blue-500/50"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <RefreshCw className="w-5 h-5 shrink-0 animate-spin" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                Update available
              </p>
              <p className="text-sm font-medium text-white truncate">
                New version of ovoo is ready
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={applyUpdate}
              className="px-3 py-1 bg-white text-blue-700 hover:bg-blue-50 active:bg-blue-100 text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              Update
            </button>
            <button
              type="button"
              onClick={dismissUpdate}
              aria-label="Dismiss update notification"
              className="p-1 text-blue-200 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PWA Install Banner */}
      {canInstall && !isInstallDismissed && (
        <div
          role="region"
          aria-label="App installation prompt"
          className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3.5 rounded-2xl shadow-xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/icons/icon-192.png"
                alt="ovoo logo"
                className="w-10 h-10 rounded-xl shrink-0 shadow-xs object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  Install ovoo
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Fast & standalone Nomad experience
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {hasDeferredPrompt && (
                <button
                  type="button"
                  onClick={promptInstall}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install</span>
                </button>
              )}

              {isIos && !hasDeferredPrompt && (
                <button
                  type="button"
                  onClick={() => setShowIosInstructions((prev) => !prev)}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg transition-colors"
                >
                  {showIosInstructions ? 'Hide' : 'How to'}
                </button>
              )}

              <button
                type="button"
                onClick={dismissInstall}
                aria-label="Dismiss installation prompt"
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* iOS Safari instructions collapsible */}
          {isIos && showIosInstructions && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
              <div className="flex items-center gap-2">
                <Share className="w-4 h-4 text-blue-500 shrink-0" />
                <span>1. Tap the <strong>Share</strong> button in Safari</span>
              </div>
              <div className="flex items-center gap-2">
                <PlusSquare className="w-4 h-4 text-blue-500 shrink-0" />
                <span>2. Select <strong>Add to Home Screen</strong></span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default PwaInstallPrompt;
