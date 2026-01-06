import { useState, useEffect, useCallback } from 'react';
import { createNomadClient } from '../../../lib/api/nomad';
import { useToast } from '../../../context/ToastContext';
import { LoadingSpinner, ErrorAlert, RefreshButton, Modal } from '../../ui';

interface VersionsTabProps {
  jobId: string;
  namespace: string;
}

interface JobVersion {
  ID: string;
  Name: string;
  Version: number;
  SubmitTime: number;
  Stable: boolean;
  Status: string;
  TaskGroups?: any[];
  Meta?: Record<string, string>;
}

function formatTimestamp(nanos: number): string {
  if (!nanos) return '-';
  const date = new Date(nanos / 1_000_000);
  return date.toLocaleString();
}

function getVersionStatusColor(stable: boolean): { bg: string; text: string } {
  if (stable) {
    return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' };
  }
  return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' };
}

export function VersionsTab({ jobId, namespace }: VersionsTabProps) {
  const { addToast } = useToast();
  const [versions, setVersions] = useState<JobVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<[number | null, number | null]>([null, null]);
  const [showDiff, setShowDiff] = useState(false);
  const [revertingVersion, setRevertingVersion] = useState<number | null>(null);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const client = createNomadClient();
      const data = await client.getJobVersions(jobId, namespace);
      // Sort by version number descending (newest first)
      const sorted = [...(data.Versions || [])].sort((a, b) => b.Version - a.Version);
      setVersions(sorted);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch versions');
    } finally {
      setLoading(false);
    }
  }, [jobId, namespace]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleRevert = async () => {
    if (revertingVersion === null) return;

    try {
      const client = createNomadClient();
      const result = await client.revertJob(jobId, revertingVersion, namespace);
      addToast(`Job reverted to version ${revertingVersion}. Evaluation ID: ${result.EvalID.slice(0, 8)}`, 'success');
      setShowRevertConfirm(false);
      setRevertingVersion(null);
      // Refresh versions
      await fetchVersions();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to revert job', 'error');
    }
  };

  const toggleVersionSelection = (version: number) => {
    if (selectedVersions[0] === version) {
      setSelectedVersions([null, selectedVersions[1]]);
    } else if (selectedVersions[1] === version) {
      setSelectedVersions([selectedVersions[0], null]);
    } else if (selectedVersions[0] === null) {
      setSelectedVersions([version, selectedVersions[1]]);
    } else if (selectedVersions[1] === null) {
      setSelectedVersions([selectedVersions[0], version]);
    } else {
      // Replace first selection
      setSelectedVersions([version, selectedVersions[1]]);
    }
  };

  const getVersionById = (version: number): JobVersion | undefined => {
    return versions.find((v) => v.Version === version);
  };

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
          Version History ({versions.length})
        </h3>
        <div className="flex items-center gap-2">
          {selectedVersions[0] !== null && selectedVersions[1] !== null && (
            <button
              onClick={() => setShowDiff(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Compare v{selectedVersions[0]} vs v{selectedVersions[1]}
            </button>
          )}
          <RefreshButton onClick={fetchVersions} />
        </div>
      </div>

      {selectedVersions[0] !== null || selectedVersions[1] !== null ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Selected for comparison: {' '}
          {selectedVersions[0] !== null && <span className="font-medium">v{selectedVersions[0]}</span>}
          {selectedVersions[0] !== null && selectedVersions[1] !== null && ' vs '}
          {selectedVersions[1] !== null && <span className="font-medium">v{selectedVersions[1]}</span>}
          {' '}
          <button
            onClick={() => setSelectedVersions([null, null])}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Click on versions to select them for comparison
        </div>
      )}

      {versions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
          No versions found for this job.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Version
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Task Groups
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {versions.map((version, index) => {
                  const statusColors = getVersionStatusColor(version.Stable);
                  const isSelected = selectedVersions.includes(version.Version);
                  const isLatest = index === 0;

                  return (
                    <tr
                      key={version.Version}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => toggleVersionSelection(version.Version)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            v{version.Version}
                          </span>
                          {isLatest && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              current
                            </span>
                          )}
                          {isSelected && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                              selected
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}>
                          {version.Stable ? 'stable' : 'unstable'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatTimestamp(version.SubmitTime)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {version.TaskGroups?.length || 0} groups
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {!isLatest && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRevertingVersion(version.Version);
                              setShowRevertConfirm(true);
                            }}
                            className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                          >
                            Revert
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revert Confirmation Modal */}
      <Modal isOpen={showRevertConfirm} onClose={() => setShowRevertConfirm(false)} title="Confirm Revert">
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to revert job <strong>{jobId}</strong> to version{' '}
          <strong>{revertingVersion}</strong>? This will create a new deployment with
          the configuration from that version.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowRevertConfirm(false)}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleRevert}
            className="px-4 py-2 text-sm font-medium rounded-md bg-yellow-600 text-white hover:bg-yellow-700"
          >
            Revert to v{revertingVersion}
          </button>
        </div>
      </Modal>

      {/* Diff Modal */}
      <Modal
        isOpen={showDiff}
        onClose={() => setShowDiff(false)}
        title={`Version Comparison: v${selectedVersions[0]} vs v${selectedVersions[1]}`}
        size="xl"
      >
        <div className="grid grid-cols-2 gap-4">
          {[selectedVersions[0], selectedVersions[1]].map((v) => {
            const version = v !== null ? getVersionById(v) : null;
            return (
              <div key={v} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Version {v}
                </h4>
                {version && (
                  <pre className="text-xs bg-gray-100 dark:bg-gray-600 p-3 rounded overflow-auto max-h-96 text-gray-900 dark:text-gray-100">
                    {JSON.stringify(
                      {
                        Name: version.Name,
                        Version: version.Version,
                        Stable: version.Stable,
                        SubmitTime: formatTimestamp(version.SubmitTime),
                        TaskGroups: version.TaskGroups?.map((tg: any) => ({
                          Name: tg.Name,
                          Count: tg.Count,
                          Tasks: tg.Tasks?.map((t: any) => ({
                            Name: t.Name,
                            Driver: t.Driver,
                            Image: t.Config?.image,
                            Resources: t.Resources,
                          })),
                        })),
                        Meta: version.Meta,
                      },
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
