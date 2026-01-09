import { useState, useEffect, useCallback } from 'react';
import { createNomadClient } from '../../../lib/api/nomad';
import { NomadEvaluation } from '../../../types/nomad';
import { LoadingSpinner, ErrorAlert, RefreshButton } from '../../ui';
import { getStatusClasses, getEvaluationStatusColor } from '../../../lib/utils/statusColors';
import { formatTimestamp } from '../../../lib/utils/dateFormatter';

interface EvaluationsTabProps {
  jobId: string;
  namespace: string;
}

export function EvaluationsTab({ jobId, namespace }: EvaluationsTabProps) {
  const [evaluations, setEvaluations] = useState<NomadEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEval, setExpandedEval] = useState<string | null>(null);

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const client = createNomadClient();
      const data = await client.getJobEvaluations(jobId, namespace);
      // Sort by CreateTime descending (newest first)
      const sorted = [...data].sort((a, b) => b.CreateTime - a.CreateTime);
      setEvaluations(sorted);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch evaluations');
    } finally {
      setLoading(false);
    }
  }, [jobId, namespace]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  if (loading) {
    return (
      <div className="py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4">
        <ErrorAlert message={error} />
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Evaluations ({evaluations.length})
        </h3>
        <RefreshButton onClick={fetchEvaluations} />
      </div>

      {evaluations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
          No evaluations found for this job.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Triggered By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {evaluations.map((evaluation) => {
                  const statusColors = getEvaluationStatusColor(evaluation.Status);
                  const isExpanded = expandedEval === evaluation.ID;
                  const hasFailures = evaluation.FailedTGAllocs && Object.keys(evaluation.FailedTGAllocs).length > 0;

                  return (
                    <>
                      <tr
                        key={evaluation.ID}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${hasFailures ? 'cursor-pointer' : ''}`}
                        onClick={() => hasFailures && setExpandedEval(isExpanded ? null : evaluation.ID)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {hasFailures && (
                              <svg
                                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                            <span className="font-mono text-sm text-gray-900 dark:text-white">
                              {evaluation.ID.slice(0, 8)}
                            </span>
                            {evaluation.BlockedEval && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                blocked
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClasses(statusColors)}`}>
                            {evaluation.Status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {evaluation.TriggeredBy}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {evaluation.Type}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {formatTimestamp(evaluation.CreateTime)}
                        </td>
                      </tr>
                      {isExpanded && hasFailures && (
                        <tr key={`${evaluation.ID}-details`}>
                          <td colSpan={5} className="px-4 py-4 bg-gray-50 dark:bg-gray-700/30">
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                Placement Failures
                              </h4>
                              {Object.entries(evaluation.FailedTGAllocs!).map(([taskGroup, failures]) => (
                                <div key={taskGroup} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                  <div className="font-medium text-gray-900 dark:text-white mb-2">
                                    Task Group: {taskGroup}
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Nodes Evaluated:</span>
                                      <span className="ml-2 text-gray-900 dark:text-white">{failures.NodesEvaluated}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Nodes Filtered:</span>
                                      <span className="ml-2 text-gray-900 dark:text-white">{failures.NodesFiltered}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Nodes Exhausted:</span>
                                      <span className="ml-2 text-gray-900 dark:text-white">{failures.NodesExhausted}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Coalesced Failures:</span>
                                      <span className="ml-2 text-gray-900 dark:text-white">{failures.CoalescedFailures}</span>
                                    </div>
                                  </div>
                                  {failures.ConstraintFiltered && Object.keys(failures.ConstraintFiltered).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                      <span className="text-sm text-gray-500 dark:text-gray-400">Constraint Failures:</span>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {Object.entries(failures.ConstraintFiltered).map(([constraint, count]) => (
                                          <span key={constraint} className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                                            {constraint}: {count}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {failures.DimensionExhausted && Object.keys(failures.DimensionExhausted).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                      <span className="text-sm text-gray-500 dark:text-gray-400">Resource Exhausted:</span>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {Object.entries(failures.DimensionExhausted).map(([dimension, count]) => (
                                          <span key={dimension} className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                                            {dimension}: {count}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
