import { useState } from 'react';
import { Modal, ErrorAlert } from '../ui';
import { NomadJobPlanResponse, NomadJobDiff, NomadFieldDiff, NomadObjectDiff, NomadTaskGroupDiff } from '../../types/nomad';

interface JobPlanPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planResult: NomadJobPlanResponse | null;
  isLoading: boolean;
  error: string | null;
  isSubmitting: boolean;
}

function getDiffTypeColor(type: string): string {
  switch (type) {
    case 'Added':
      return 'text-green-600 dark:text-green-400';
    case 'Deleted':
      return 'text-red-600 dark:text-red-400';
    case 'Edited':
      return 'text-yellow-600 dark:text-yellow-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

function getDiffTypeBg(type: string): string {
  switch (type) {
    case 'Added':
      return 'bg-green-50 dark:bg-green-900/20';
    case 'Deleted':
      return 'bg-red-50 dark:bg-red-900/20';
    case 'Edited':
      return 'bg-yellow-50 dark:bg-yellow-900/20';
    default:
      return '';
  }
}

function FieldDiffDisplay({ field }: { field: NomadFieldDiff }) {
  if (field.Type === 'None') return null;

  // For Edited fields - show git-style two-line diff
  if (field.Type === 'Edited') {
    return (
      <div className="space-y-0.5">
        {field.Old && (
          <div className={`py-1 px-2 rounded text-sm ${getDiffTypeBg('Deleted')}`}>
            <span className="font-medium text-red-600 dark:text-red-400">-</span>{' '}
            <span className="font-mono text-gray-700 dark:text-gray-300">{field.Name}</span>
            <span className="text-red-600 dark:text-red-400 font-mono"> "{field.Old}"</span>
          </div>
        )}
        {field.New && (
          <div className={`py-1 px-2 rounded text-sm ${getDiffTypeBg('Added')}`}>
            <span className="font-medium text-green-600 dark:text-green-400">+</span>{' '}
            <span className="font-mono text-gray-700 dark:text-gray-300">{field.Name}</span>
            <span className="text-green-600 dark:text-green-400 font-mono"> "{field.New}"</span>
          </div>
        )}
      </div>
    );
  }

  // For Added/Deleted - keep single line display
  return (
    <div className={`py-1 px-2 rounded text-sm ${getDiffTypeBg(field.Type)}`}>
      <span className={`font-medium ${getDiffTypeColor(field.Type)}`}>
        {field.Type === 'Added' ? '+' : '-'}
      </span>{' '}
      <span className="font-mono text-gray-700 dark:text-gray-300">{field.Name}</span>
      {field.Type === 'Deleted' && field.Old && (
        <span className="text-red-600 dark:text-red-400 font-mono"> "{field.Old}"</span>
      )}
      {field.Type === 'Added' && field.New && (
        <span className="text-green-600 dark:text-green-400 font-mono"> "{field.New}"</span>
      )}
    </div>
  );
}

function ObjectDiffDisplay({ obj, depth = 0 }: { obj: NomadObjectDiff; depth?: number }) {
  if (obj.Type === 'None') return null;

  return (
    <div className={`ml-${depth * 2} py-1`}>
      <div className={`font-medium ${getDiffTypeColor(obj.Type)}`}>
        {obj.Type === 'Added' ? '+' : obj.Type === 'Deleted' ? '-' : '~'} {obj.Name}
      </div>
      <div className="ml-4">
        {obj.Fields?.filter(f => f.Type !== 'None').map((field, i) => (
          <FieldDiffDisplay key={i} field={field} />
        ))}
        {obj.Objects?.filter(o => o.Type !== 'None').map((nested, i) => (
          <ObjectDiffDisplay key={i} obj={nested} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}

function TaskGroupDiffDisplay({ tg }: { tg: NomadTaskGroupDiff }) {
  if (tg.Type === 'None') return null;

  return (
    <div className={`border rounded-lg p-3 mb-3 ${getDiffTypeBg(tg.Type)} border-gray-200 dark:border-gray-700`}>
      <h5 className={`font-medium mb-2 ${getDiffTypeColor(tg.Type)}`}>
        {tg.Type === 'Added' ? '+ ' : tg.Type === 'Deleted' ? '- ' : '~ '}
        Task Group: {tg.Name}
      </h5>

      {/* Updates summary */}
      {tg.Updates && Object.keys(tg.Updates).length > 0 && (
        <div className="mb-2 text-sm">
          {Object.entries(tg.Updates)
            .filter(([, count]) => count > 0)
            .map(([action, count]) => (
              <span key={action} className={`mr-2 px-2 py-0.5 rounded ${
                action === 'create' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                action === 'destroy' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                {count} {action}
              </span>
            ))}
        </div>
      )}

      {/* Field diffs */}
      {tg.Fields?.filter(f => f.Type !== 'None').map((field, i) => (
        <FieldDiffDisplay key={i} field={field} />
      ))}

      {/* Object diffs */}
      {tg.Objects?.filter(o => o.Type !== 'None').map((obj, i) => (
        <ObjectDiffDisplay key={i} obj={obj} />
      ))}

      {/* Task diffs */}
      {tg.Tasks?.filter(t => t.Type !== 'None').map((task, i) => (
        <div key={i} className="ml-4 mt-2 p-2 border-l-2 border-gray-300 dark:border-gray-600">
          <span className={`font-medium ${getDiffTypeColor(task.Type)}`}>
            Task: {task.Name}
          </span>
          <div className="ml-2">
            {task.Fields?.filter(f => f.Type !== 'None').map((field, j) => (
              <FieldDiffDisplay key={j} field={field} />
            ))}
            {task.Objects?.filter(o => o.Type !== 'None').map((obj, j) => (
              <ObjectDiffDisplay key={j} obj={obj} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function JobDiffDisplay({ diff }: { diff: NomadJobDiff }) {
  if (diff.Type === 'None') {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-4">
        No changes detected
      </div>
    );
  }

  return (
    <div>
      {/* Job-level fields */}
      {diff.Fields?.filter(f => f.Type !== 'None').map((field, i) => (
        <FieldDiffDisplay key={i} field={field} />
      ))}

      {/* Job-level objects */}
      {diff.Objects?.filter(o => o.Type !== 'None').map((obj, i) => (
        <ObjectDiffDisplay key={i} obj={obj} />
      ))}

      {/* Task Groups */}
      {diff.TaskGroups?.filter(tg => tg.Type !== 'None').map((tg, i) => (
        <TaskGroupDiffDisplay key={i} tg={tg} />
      ))}
    </div>
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
              <div className="font-mono text-sm">
                <JobDiffDisplay diff={planResult.Diff} />
              </div>
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
