import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import { PageHeader, BackLink, LoadingSpinner, ErrorAlert } from '../components/ui';
import { ExecTerminal } from '../components/exec/ExecTerminal';

interface AllocationInfo {
  ID: string;
  Name: string;
  JobID: string;
  TaskGroup: string;
  Namespace: string;
  NodeID: string;
  ClientStatus: string;
}

const SHELL_OPTIONS = [
  { value: '/bin/sh', label: '/bin/sh' },
  { value: '/bin/bash', label: '/bin/bash' },
  { value: '/bin/zsh', label: '/bin/zsh' },
  { value: '/bin/ash', label: '/bin/ash (Alpine)' },
];

export default function ExecPage() {
  const { allocId, task } = useParams<{ allocId: string; task: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [allocation, setAllocation] = useState<AllocationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shell, setShell] = useState('/bin/sh');
  const [customCommand, setCustomCommand] = useState('');
  const [useCustomCommand, setUseCustomCommand] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const namespace = searchParams.get('namespace') || 'default';

  useEffect(() => {
    const fetchAllocation = async () => {
      if (!allocId) return;

      try {
        const client = createNomadClient();
        const alloc = await client.getAllocation(allocId);
        setAllocation({
          ID: alloc.ID,
          Name: alloc.Name,
          JobID: alloc.JobID,
          TaskGroup: alloc.TaskGroup,
          Namespace: alloc.Namespace,
          NodeID: alloc.NodeID,
          ClientStatus: alloc.ClientStatus,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch allocation');
      } finally {
        setLoading(false);
      }
    };

    fetchAllocation();
  }, [allocId]);

  const handleStartSession = () => {
    setSessionStarted(true);
  };

  const handleExitSession = (_exitCode: number) => {
    // Session ended - could show notification here if needed
  };

  const getCommand = (): string[] => {
    if (useCustomCommand && customCommand.trim()) {
      return ['sh', '-c', customCommand];
    }
    return [shell];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Remote Exec" description="Loading allocation..." />
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Remote Exec" description="Error loading allocation" />
        <ErrorAlert message={error} />
        <BackLink to="/allocations" label="Back to Allocations" />
      </div>
    );
  }

  if (!allocId || !task) {
    return (
      <div className="space-y-6">
        <PageHeader title="Remote Exec" description="Missing parameters" />
        <ErrorAlert message="Allocation ID and task name are required" />
        <BackLink to="/allocations" label="Back to Allocations" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Remote Exec"
        description={`Execute commands in ${task} task`}
      />

      {/* Allocation info */}
      {allocation && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Job</span>
              <p className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                 onClick={() => navigate(`/jobs/${allocation.JobID}?namespace=${allocation.Namespace}`)}>
                {allocation.JobID}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Task Group</span>
              <p className="font-medium text-gray-900 dark:text-white">{allocation.TaskGroup}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Task</span>
              <p className="font-medium text-gray-900 dark:text-white">{task}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <p className={`font-medium ${
                allocation.ClientStatus === 'running' ? 'text-green-600 dark:text-green-400' :
                allocation.ClientStatus === 'failed' ? 'text-red-600 dark:text-red-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {allocation.ClientStatus}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session not started - show options */}
      {!sessionStarted ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Start Exec Session
          </h3>

          <div className="space-y-4">
            {/* Shell selection */}
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  checked={!useCustomCommand}
                  onChange={() => setUseCustomCommand(false)}
                  className="text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Interactive shell</span>
              </label>
              {!useCustomCommand && (
                <select
                  value={shell}
                  onChange={(e) => setShell(e.target.value)}
                  className="mt-1 block w-full md:w-64 pl-3 pr-10 py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                >
                  {SHELL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Custom command */}
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  checked={useCustomCommand}
                  onChange={() => setUseCustomCommand(true)}
                  className="text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Custom command</span>
              </label>
              {useCustomCommand && (
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="e.g., cat /etc/os-release"
                  className="mt-1 block w-full pl-3 pr-3 py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md font-mono"
                />
              )}
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> Commands execute with the permissions of the task.
                Be careful when running commands that modify the container state.
              </p>
            </div>

            {/* Start button */}
            <button
              onClick={handleStartSession}
              disabled={useCustomCommand && !customCommand.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors"
            >
              Start Session
            </button>
          </div>
        </div>
      ) : (
        /* Terminal */
        <div className="flex-1 bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden min-h-[500px]">
          <ExecTerminal
            allocId={allocId}
            task={task}
            command={getCommand()}
            onExit={handleExitSession}
          />
        </div>
      )}

      <BackLink
        to={`/jobs/${allocation?.JobID}?namespace=${namespace}`}
        label="Back to Job"
      />
    </div>
  );
}
