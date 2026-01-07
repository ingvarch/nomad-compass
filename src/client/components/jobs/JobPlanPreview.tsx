import { useState } from 'react';
import { Modal, ErrorAlert } from '../ui';
import { NomadJobPlanResponse, NomadJobDiff, NomadFieldDiff, NomadObjectDiff, NomadTaskGroupDiff, NomadTaskDiff } from '../../types/nomad';

// Types for HCL-style diff rendering
interface HclLine {
  prefix: '+' | '-' | ' ';
  indent: number;
  content: string;
  type: 'added' | 'deleted' | 'none';
}

interface GroupedFields {
  simple: NomadFieldDiff[];
  blocks: Map<string, NomadFieldDiff[]>;
}

// Utility: Parse field names like "Env[FOO]" into { block: "env", key: "FOO" }
function parseFieldName(name: string): { block: string | null; key: string } {
  const match = name.match(/^(\w+)\[(.+)\]$/);
  if (match) {
    return { block: match[1].toLowerCase(), key: match[2] };
  }
  return { block: null, key: name };
}

// Utility: Group indexed fields by block type
function groupFields(fields: NomadFieldDiff[]): GroupedFields {
  const result: GroupedFields = { simple: [], blocks: new Map() };

  for (const field of fields) {
    if (field.Type === 'None') continue;
    const { block, key } = parseFieldName(field.Name);
    if (block) {
      if (!result.blocks.has(block)) {
        result.blocks.set(block, []);
      }
      result.blocks.get(block)!.push({ ...field, Name: key });
    } else {
      result.simple.push(field);
    }
  }

  return result;
}

// Utility: Convert PascalCase/camelCase to snake_case for HCL
function toSnakeCase(name: string): string {
  return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// Utility: Format value with smart quoting
function formatValue(value: string): string {
  if (value === 'true' || value === 'false') return value;
  if (/^\d+$/.test(value)) return value;
  if (/^\d+\.\d+$/.test(value)) return value;
  return `"${value}"`;
}

// Get diff type from field
function getDiffType(type: string): 'added' | 'deleted' | 'none' {
  if (type === 'Added') return 'added';
  if (type === 'Deleted') return 'deleted';
  return 'none';
}

// Get prefix for diff type
function getPrefix(type: string): '+' | '-' | ' ' {
  if (type === 'Added') return '+';
  if (type === 'Deleted') return '-';
  return ' ';
}

interface JobPlanPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planResult: NomadJobPlanResponse | null;
  isLoading: boolean;
  error: string | null;
  isSubmitting: boolean;
}

// HCL Generator: Render a single field as HCL assignment
function renderFieldAsHcl(field: NomadFieldDiff, indent: number): HclLine[] {
  const lines: HclLine[] = [];
  const key = toSnakeCase(field.Name);

  if (field.Type === 'Edited') {
    if (field.Old) {
      lines.push({
        prefix: '-',
        indent,
        content: `${key} = ${formatValue(field.Old)}`,
        type: 'deleted'
      });
    }
    if (field.New) {
      lines.push({
        prefix: '+',
        indent,
        content: `${key} = ${formatValue(field.New)}`,
        type: 'added'
      });
    }
  } else {
    const value = field.Type === 'Deleted' ? field.Old : field.New;
    if (value) {
      lines.push({
        prefix: getPrefix(field.Type),
        indent,
        content: `${key} = ${formatValue(value)}`,
        type: getDiffType(field.Type)
      });
    }
  }

  return lines;
}

// HCL Generator: Render grouped fields as a block (env, meta, etc.)
function renderBlockFields(blockName: string, fields: NomadFieldDiff[], indent: number, parentType: string): HclLine[] {
  if (fields.length === 0) return [];

  const lines: HclLine[] = [];
  const blockType = parentType === 'Edited' ? 'none' : getDiffType(parentType);
  const blockPrefix = parentType === 'Edited' ? ' ' : getPrefix(parentType);

  // Opening brace
  lines.push({ prefix: blockPrefix, indent, content: `${blockName} {`, type: blockType });

  // Fields inside block
  for (const field of fields) {
    const fieldLines = renderFieldAsHcl(field, indent + 1);
    lines.push(...fieldLines);
  }

  // Closing brace
  lines.push({ prefix: blockPrefix, indent, content: '}', type: blockType });

  return lines;
}

// HCL Generator: Process object diff recursively
function processObjectDiff(obj: NomadObjectDiff, indent: number): HclLine[] {
  if (obj.Type === 'None') return [];

  const lines: HclLine[] = [];
  const hclName = toSnakeCase(obj.Name);
  const objType = getDiffType(obj.Type);
  const objPrefix = getPrefix(obj.Type);

  // For edited objects, we show the block structure without prefix on braces
  const blockPrefix = obj.Type === 'Edited' ? ' ' : objPrefix;
  const blockType = obj.Type === 'Edited' ? 'none' : objType;

  // Opening brace
  lines.push({ prefix: blockPrefix, indent, content: `${hclName} {`, type: blockType });

  // Process fields
  if (obj.Fields) {
    const grouped = groupFields(obj.Fields);

    // Simple fields first
    for (const field of grouped.simple) {
      lines.push(...renderFieldAsHcl(field, indent + 1));
    }

    // Grouped blocks (env, meta, etc.)
    for (const [blockName, blockFields] of grouped.blocks) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...renderBlockFields(blockName, blockFields, indent + 1, obj.Type));
    }
  }

  // Nested objects
  if (obj.Objects) {
    for (const nested of obj.Objects.filter(o => o.Type !== 'None')) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processObjectDiff(nested, indent + 1));
    }
  }

  // Closing brace
  lines.push({ prefix: blockPrefix, indent, content: '}', type: blockType });

  return lines;
}

// HCL Generator: Process task diff
function processTaskDiff(task: NomadTaskDiff, indent: number): HclLine[] {
  if (task.Type === 'None') return [];

  const lines: HclLine[] = [];
  const taskType = getDiffType(task.Type);
  const taskPrefix = getPrefix(task.Type);

  const blockPrefix = task.Type === 'Edited' ? ' ' : taskPrefix;
  const blockType = task.Type === 'Edited' ? 'none' : taskType;

  // Opening: task "name" {
  lines.push({ prefix: blockPrefix, indent, content: `task "${task.Name}" {`, type: blockType });

  // Process fields
  if (task.Fields) {
    const grouped = groupFields(task.Fields);

    // Simple fields first
    for (const field of grouped.simple) {
      lines.push(...renderFieldAsHcl(field, indent + 1));
    }

    // Grouped blocks
    for (const [blockName, blockFields] of grouped.blocks) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...renderBlockFields(blockName, blockFields, indent + 1, task.Type));
    }
  }

  // Nested objects (config, resources, etc.)
  if (task.Objects) {
    for (const obj of task.Objects.filter(o => o.Type !== 'None')) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processObjectDiff(obj, indent + 1));
    }
  }

  // Closing brace
  lines.push({ prefix: blockPrefix, indent, content: '}', type: blockType });

  return lines;
}

// HCL Generator: Process task group diff
function processTaskGroupDiff(tg: NomadTaskGroupDiff, indent: number): HclLine[] {
  if (tg.Type === 'None') return [];

  const lines: HclLine[] = [];
  const tgType = getDiffType(tg.Type);
  const tgPrefix = getPrefix(tg.Type);

  const blockPrefix = tg.Type === 'Edited' ? ' ' : tgPrefix;
  const blockType = tg.Type === 'Edited' ? 'none' : tgType;

  // Opening: group "name" {
  lines.push({ prefix: blockPrefix, indent, content: `group "${tg.Name}" {`, type: blockType });

  // Process fields
  if (tg.Fields) {
    const grouped = groupFields(tg.Fields);

    // Simple fields first
    for (const field of grouped.simple) {
      lines.push(...renderFieldAsHcl(field, indent + 1));
    }

    // Grouped blocks
    for (const [blockName, blockFields] of grouped.blocks) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...renderBlockFields(blockName, blockFields, indent + 1, tg.Type));
    }
  }

  // Group-level objects (network, etc.)
  if (tg.Objects) {
    for (const obj of tg.Objects.filter(o => o.Type !== 'None')) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processObjectDiff(obj, indent + 1));
    }
  }

  // Tasks
  if (tg.Tasks) {
    for (const task of tg.Tasks.filter(t => t.Type !== 'None')) {
      if (lines.length > 1) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processTaskDiff(task, indent + 1));
    }
  }

  // Closing brace
  lines.push({ prefix: blockPrefix, indent, content: '}', type: blockType });

  return lines;
}

// HCL Generator: Entry point - process entire job diff
function processJobDiff(diff: NomadJobDiff): HclLine[] {
  if (diff.Type === 'None') return [];

  const lines: HclLine[] = [];

  // Job-level fields
  if (diff.Fields) {
    const grouped = groupFields(diff.Fields);
    for (const field of grouped.simple) {
      lines.push(...renderFieldAsHcl(field, 0));
    }
    for (const [blockName, blockFields] of grouped.blocks) {
      lines.push(...renderBlockFields(blockName, blockFields, 0, diff.Type));
    }
  }

  // Job-level objects
  if (diff.Objects) {
    for (const obj of diff.Objects.filter(o => o.Type !== 'None')) {
      if (lines.length > 0) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processObjectDiff(obj, 0));
    }
  }

  // Task groups
  if (diff.TaskGroups) {
    for (const tg of diff.TaskGroups.filter(t => t.Type !== 'None')) {
      if (lines.length > 0) {
        lines.push({ prefix: ' ', indent: 0, content: '', type: 'none' });
      }
      lines.push(...processTaskGroupDiff(tg, 0));
    }
  }

  return lines;
}

// React Component: Single HCL diff line
function HclDiffLine({ line }: { line: HclLine }) {
  const indentSpaces = '  '.repeat(line.indent);

  const colorClasses: Record<string, string> = {
    added: 'text-green-400 bg-green-950/40',
    deleted: 'text-red-400 bg-red-950/40',
    none: 'text-gray-300'
  };

  const prefixClasses: Record<string, string> = {
    added: 'text-green-500',
    deleted: 'text-red-500',
    none: 'text-gray-500'
  };

  return (
    <div className={`${colorClasses[line.type]} leading-relaxed`}>
      <span className={`select-none ${prefixClasses[line.type]}`}>{line.prefix}</span>
      <span className="select-none">{indentSpaces}</span>
      <span>{line.content}</span>
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
