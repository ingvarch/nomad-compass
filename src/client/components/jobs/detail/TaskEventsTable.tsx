import { useState } from 'react';
import { NomadAllocation, NomadTaskEvent } from '../../../types/nomad';
import ExpandIcon from '../../ui/ExpandIcon';

interface TaskEventsTableProps {
  allocations: NomadAllocation[];
  taskGroupName?: string;
}

function formatTimestamp(nanos: number): string {
  if (!nanos) return '-';
  const date = new Date(nanos / 1_000_000);
  return date.toLocaleString();
}

function getEventTypeColor(type: string, failsTask?: boolean): string {
  if (failsTask) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
  }
  switch (type) {
    case 'Started':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    case 'Terminated':
    case 'Killed':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    case 'Restarting':
    case 'Killing':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    case 'Driver Failure':
    case 'Setup Failure':
    case 'Failed Validation':
    case 'Not Restarting':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
    case 'Received':
    case 'Task Setup':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  }
}

interface TaskEventsRowData {
  allocId: string;
  allocName: string;
  taskName: string;
  taskState: string;
  taskFailed: boolean;
  events: NomadTaskEvent[];
}

export function TaskEventsTable({ allocations, taskGroupName }: TaskEventsTableProps) {
  const [expandedAlloc, setExpandedAlloc] = useState<string | null>(null);

  // Filter allocations by task group if provided
  const filteredAllocations = taskGroupName
    ? allocations.filter((a) => a.TaskGroup === taskGroupName)
    : allocations;

  // Extract task events from allocations
  const taskEventsData: TaskEventsRowData[] = [];
  filteredAllocations.forEach((alloc) => {
    if (alloc.TaskStates) {
      Object.entries(alloc.TaskStates).forEach(([taskName, taskState]) => {
        taskEventsData.push({
          allocId: alloc.ID,
          allocName: alloc.Name,
          taskName,
          taskState: taskState.State,
          taskFailed: taskState.Failed,
          events: taskState.Events || [],
        });
      });
    }
  });

  // Sort by most recent event first
  taskEventsData.sort((a, b) => {
    const aTime = a.events[0]?.Time || 0;
    const bTime = b.events[0]?.Time || 0;
    return bTime - aTime;
  });

  if (taskEventsData.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        No task events available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Allocation
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Task
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              State
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Latest Event
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {taskEventsData.map((data) => {
            const latestEvent = data.events[0];
            const isExpanded = expandedAlloc === `${data.allocId}-${data.taskName}`;
            const hasMultipleEvents = data.events.length > 1;

            return (
              <>
                <tr
                  key={`${data.allocId}-${data.taskName}`}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${hasMultipleEvents ? 'cursor-pointer' : ''}`}
                  onClick={() =>
                    hasMultipleEvents &&
                    setExpandedAlloc(isExpanded ? null : `${data.allocId}-${data.taskName}`)
                  }
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {hasMultipleEvents && (
                        <ExpandIcon isExpanded={isExpanded} className="h-4 w-4" />
                      )}
                      <span className="font-mono text-sm text-gray-900 dark:text-white">
                        {data.allocId.slice(0, 8)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {data.taskName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        data.taskFailed
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : data.taskState === 'running'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {data.taskFailed ? 'failed' : data.taskState}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {latestEvent && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getEventTypeColor(latestEvent.Type, latestEvent.FailsTask)}`}
                        >
                          {latestEvent.Type}
                        </span>
                        {latestEvent.DisplayMessage && (
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                            {latestEvent.DisplayMessage}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {latestEvent ? formatTimestamp(latestEvent.Time) : '-'}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${data.allocId}-${data.taskName}-events`}>
                    <td colSpan={5} className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Event History ({data.events.length} events)
                        </h4>
                        <div className="space-y-1">
                          {data.events.map((event, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 py-2 border-b border-gray-200 dark:border-gray-600 last:border-0"
                            >
                              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[140px]">
                                {formatTimestamp(event.Time)}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap ${getEventTypeColor(event.Type, event.FailsTask)}`}
                              >
                                {event.Type}
                              </span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                {event.DisplayMessage || event.Message || '-'}
                              </span>
                              {event.Details && Object.keys(event.Details).length > 0 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {Object.entries(event.Details).map(([key, value]) => (
                                    <span key={key} className="mr-2">
                                      {key}: {value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
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
  );
}
