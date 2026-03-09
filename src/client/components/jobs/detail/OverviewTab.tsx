import { useState } from 'react';
import { JobSummary, NetworkAccessCard, TaskGroupCard, TaskEventsTable } from './index';
import ExpandIcon from '../../ui/ExpandIcon';
import type { NomadAllocation, NomadServiceRegistration, NomadJob, NomadTaskGroup } from '../../../types/nomad';

interface OverviewTabProps {
  job: NomadJob;
  allocations: NomadAllocation[];
  serviceRegistrations: NomadServiceRegistration[];
  createTime: number | null;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupName: string) => void;
  onToggleTask: (groupName: string, taskName: string) => void;
  onViewLogs: (groupName: string) => void;
}

export function OverviewTab({
  job,
  allocations,
  serviceRegistrations,
  createTime,
  expandedGroups,
  onToggleGroup,
  onToggleTask,
  onViewLogs,
}: OverviewTabProps) {
  const [showTaskEvents, setShowTaskEvents] = useState(false);

  // Check if there are any task events to show
  const hasTaskEvents = allocations.some(
    (a) => a.TaskStates && Object.keys(a.TaskStates).length > 0
  );

  return (
    <div className="space-y-6">
      <JobSummary job={job} allocations={allocations} createTime={createTime} />

      <NetworkAccessCard job={job} serviceRegistrations={serviceRegistrations} />

      {/* Task Groups */}
      {job.TaskGroups && job.TaskGroups.length > 0 && (
        <div className="space-y-6">
          {job.TaskGroups.map((taskGroup: NomadTaskGroup, groupIndex: number) => (
            <TaskGroupCard
              key={groupIndex}
              taskGroup={taskGroup}
              isExpanded={expandedGroups[taskGroup.Name] || false}
              expandedGroups={expandedGroups}
              onToggle={() => onToggleGroup(taskGroup.Name)}
              onToggleTask={(taskName: string) => onToggleTask(taskGroup.Name, taskName)}
              onViewLogs={() => onViewLogs(taskGroup.Name)}
            />
          ))}
        </div>
      )}

      {/* Task Events Section */}
      {hasTaskEvents && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div
            className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center cursor-pointer"
            onClick={() => setShowTaskEvents(!showTaskEvents)}
          >
            <ExpandIcon isExpanded={showTaskEvents} className="mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Task Events
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                (Recent activity from allocations)
              </span>
            </h3>
          </div>
          {showTaskEvents && (
            <TaskEventsTable allocations={allocations} />
          )}
        </div>
      )}
    </div>
  );
}
