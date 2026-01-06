import { Link } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import type { NomadAllocation } from '../../../types/nomad';

interface ExecTabProps {
  allocations: NomadAllocation[];
  namespace: string;
}

interface TaskInfo {
  allocId: string;
  allocName: string;
  taskGroup: string;
  taskName: string;
  taskState: string;
  namespace: string;
}

export function ExecTab({ allocations, namespace }: ExecTabProps) {
  // Extract running tasks from allocations
  const runningTasks: TaskInfo[] = [];

  allocations.forEach((alloc) => {
    if (alloc.ClientStatus !== 'running') return;

    if (alloc.TaskStates) {
      Object.entries(alloc.TaskStates).forEach(([taskName, taskState]) => {
        if (taskState.State === 'running') {
          runningTasks.push({
            allocId: alloc.ID,
            allocName: alloc.Name,
            taskGroup: alloc.TaskGroup,
            taskName,
            taskState: taskState.State,
            namespace: alloc.Namespace || namespace,
          });
        }
      });
    }
  });

  if (runningTasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
        <Terminal className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Running Tasks
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          There are no running tasks available for remote execution.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Remote Execution
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Connect to a running task to execute commands
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Allocation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Task Group
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {runningTasks.map((task) => (
              <tr key={`${task.allocId}-${task.taskName}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono text-sm text-gray-900 dark:text-white">
                    {task.allocId.slice(0, 8)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {task.taskGroup}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                  {task.taskName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    {task.taskState}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Link
                    to={`/exec/${task.allocId}/${task.taskName}?namespace=${task.namespace}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    <Terminal className="w-4 h-4" />
                    Connect
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
