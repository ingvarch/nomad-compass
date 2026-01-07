import { useState } from 'react';
import { Modal, ErrorAlert } from '../ui';
import { NomadJobPlanResponse, NomadJobDiff } from '../../types/nomad';
import { processJobDiff, HclLine, HCL_KEYWORDS } from '../../lib/hclDiffRenderer';

interface JobPlanPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planResult: NomadJobPlanResponse | null;
  isLoading: boolean;
  error: string | null;
  isSubmitting: boolean;
}

// Syntax highlighting for HCL content
function highlightHclContent(content: string): React.ReactNode {
  if (!content) return content;

  // Match: keyword "name" { or keyword {
  const blockMatch = content.match(/^(\w+)(\s+"[^"]+")?(\s*\{)$/);
  if (blockMatch) {
    const [, keyword, name, brace] = blockMatch;
    const isKeyword = HCL_KEYWORDS.includes(keyword);
    return (
      <>
        <span className={isKeyword ? 'text-purple-400' : ''}>{keyword}</span>
        {name && <span className="text-amber-300">{name}</span>}
        <span className="text-gray-500">{brace}</span>
      </>
    );
  }

  // Match: key = value
  const assignMatch = content.match(/^(\w+)\s*=\s*(.+)$/);
  if (assignMatch) {
    const [, key, value] = assignMatch;
    // Check if value is a string (quoted)
    const isStringValue = value.startsWith('"') && value.endsWith('"');
    // Check if value is a number or boolean
    const isLiteralValue = /^(\d+\.?\d*|true|false)$/.test(value);
    return (
      <>
        <span className="text-cyan-400">{key}</span>
        <span className="text-gray-500"> = </span>
        <span className={isStringValue ? 'text-amber-300' : isLiteralValue ? 'text-orange-400' : ''}>
          {value}
        </span>
      </>
    );
  }

  // Closing brace
  if (content === '}') {
    return <span className="text-gray-500">{'}'}</span>;
  }

  return content;
}

// React Component: Single HCL diff line with syntax highlighting
function HclDiffLine({ line }: { line: HclLine }) {
  const indentSpaces = '  '.repeat(line.indent);

  const bgClasses: Record<string, string> = {
    added: 'bg-green-950/40',
    deleted: 'bg-red-950/40',
    none: ''
  };

  const prefixClasses: Record<string, string> = {
    added: 'text-green-500',
    deleted: 'text-red-500',
    none: 'text-gray-600'
  };

  // For added/deleted lines, apply diff colors; for none, use syntax highlighting
  const shouldHighlight = line.type === 'none';
  const textColorClass = line.type === 'added' ? 'text-green-400' : line.type === 'deleted' ? 'text-red-400' : '';

  return (
    <div className={`${bgClasses[line.type]} leading-relaxed`}>
      <span className={`select-none ${prefixClasses[line.type]}`}>{line.prefix}</span>
      <span className="select-none">{indentSpaces}</span>
      <span className={textColorClass}>
        {shouldHighlight ? highlightHclContent(line.content) : line.content}
      </span>
    </div>
  );
}

// React Component: HCL-style diff display
function HclDiffDisplay({ diff }: { diff: NomadJobDiff }) {
  if (diff.Type === 'None') {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-4">
        No changes detected
      </div>
    );
  }

  const lines = processJobDiff(diff);

  return (
    <pre className="font-mono text-sm bg-gray-900 dark:bg-gray-950 p-4 rounded-lg overflow-x-auto">
      {lines.map((line, i) => (
        <HclDiffLine key={i} line={line} />
      ))}
    </pre>
  );
}

export function JobPlanPreview({
  isOpen,
  onClose,
  onConfirm,
  planResult,
  isLoading,
  error,
  isSubmitting,
}: JobPlanPreviewProps) {
  const [activeSection, setActiveSection] = useState<'summary' | 'diff' | 'failures'>('summary');

  if (!isOpen) return null;

  const hasFailures = planResult?.FailedTGAllocs && Object.keys(planResult.FailedTGAllocs).length > 0;
  const hasWarnings = !!planResult?.Warnings;
  const hasDiff = planResult?.Diff && planResult.Diff.Type !== 'None';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Job Plan Preview"
      size="xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Running plan...</span>
        </div>
      ) : error ? (
        <div className="py-4">
          <ErrorAlert message={error} />
        </div>
      ) : planResult ? (
        <div className="space-y-4">
          {/* Warnings */}
          {hasWarnings && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Warnings</h4>
              <pre className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">
                {planResult.Warnings}
              </pre>
            </div>
          )}

          {/* Placement Failures */}
          {hasFailures && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Placement Failures</h4>
              {Object.entries(planResult.FailedTGAllocs!).map(([tgName, failure]) => (
                <div key={tgName} className="mb-2">
                  <span className="font-medium">{tgName}</span>: {failure.NodesEvaluated} nodes evaluated, {failure.NodesFiltered} filtered
                  {failure.NodesExhausted > 0 && `, ${failure.NodesExhausted} exhausted`}
                  {failure.DimensionExhausted && Object.keys(failure.DimensionExhausted).length > 0 && (
                    <div className="text-sm ml-4">
                      Resources exhausted: {Object.entries(failure.DimensionExhausted).map(([dim, count]) => `${dim}: ${count}`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveSection('summary')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeSection === 'summary'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Summary
              </button>
              {hasDiff && (
                <button
                  onClick={() => setActiveSection('diff')}
                  className={`px-4 py-2 text-sm font-medium ${
                    activeSection === 'diff'
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Changes
                </button>
              )}
            </nav>
          </div>

          {/* Tab content */}
          <div className="max-h-96 overflow-y-auto">
            {activeSection === 'summary' && (
              <div className="space-y-4">
                {/* Annotations - Desired Updates */}
                {planResult.Annotations?.DesiredTGUpdates && Object.keys(planResult.Annotations.DesiredTGUpdates).length > 0 ? (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      What will happen when you submit this job:
                    </h4>
                    {Object.entries(planResult.Annotations.DesiredTGUpdates).map(([tgName, updates]) => {
                      // Calculate if there are any actual changes
                      const hasChanges = (updates.Place || 0) + (updates.Stop || 0) + (updates.Migrate || 0) +
                        (updates.InPlaceUpdate || 0) + (updates.DestructiveUpdate || 0) + (updates.Canary || 0) > 0;
                      const unchangedCount = updates.Ignore || 0;

                      return (
                        <div key={tgName} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3">
                          <div className="font-medium text-gray-900 dark:text-white mb-3">
                            Task Group: <span className="text-blue-600 dark:text-blue-400">{tgName}</span>
                          </div>

                          {hasChanges ? (
                            <div className="space-y-2">
                              {(updates.Place ?? 0) > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    <strong>{updates.Place}</strong> new allocation{(updates.Place ?? 0) > 1 ? 's' : ''} will be created
                                  </span>
                                </div>
                              )}
                              {(updates.Stop ?? 0) > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    <strong>{updates.Stop}</strong> allocation{(updates.Stop ?? 0) > 1 ? 's' : ''} will be stopped
                                  </span>
                                </div>
                              )}
                              {(updates.Migrate ?? 0) > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    <strong>{updates.Migrate}</strong> allocation{(updates.Migrate ?? 0) > 1 ? 's' : ''} will be migrated to different node{(updates.Migrate ?? 0) > 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                              {(updates.InPlaceUpdate ?? 0) > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    <strong>{updates.InPlaceUpdate}</strong> allocation{(updates.InPlaceUpdate ?? 0) > 1 ? 's' : ''} will be updated in-place (no restart)
                                  </span>
                                </div>
                              )}
                              {(updates.DestructiveUpdate ?? 0) > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    <strong>{updates.DestructiveUpdate}</strong> allocation{(updates.DestructiveUpdate ?? 0) > 1 ? 's' : ''} will be recreated (destructive update)
                                  </span>
                                </div>
                              )}
                              {(updates.Canary ?? 0) > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    <strong>{updates.Canary}</strong> canary allocation{(updates.Canary ?? 0) > 1 ? 's' : ''} will be deployed
                                  </span>
                                </div>
                              )}
                              {unchangedCount > 0 && (
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                                  <span className="text-sm">
                                    {unchangedCount} allocation{unchangedCount > 1 ? 's' : ''} unchanged
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : unchangedCount > 0 ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              No changes - {unchangedCount} allocation{unchangedCount > 1 ? 's' : ''} will remain unchanged
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              No allocations affected
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-gray-400 dark:text-gray-500 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 font-medium">No changes detected</div>
                    <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      The job specification matches the current running state
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'diff' && planResult.Diff && (
              <HclDiffDisplay diff={planResult.Diff} />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting || hasFailures}
              className={`px-4 py-2 text-sm font-medium rounded-md text-white ${
                hasFailures
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isSubmitting
                    ? 'bg-blue-400 cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Submitting...' : hasFailures ? 'Cannot Submit (Placement Failed)' : 'Confirm & Submit'}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export default JobPlanPreview;
