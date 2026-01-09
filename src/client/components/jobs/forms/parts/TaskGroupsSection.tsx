import React from 'react';
import { useJobFormContext, jobFormActions, defaultTaskGroupData } from '../../../../context/JobFormContext';
import TaskGroupForm from '../TaskGroupForm';

/**
 * TaskGroupsSection - Manages the list of task groups in the job form.
 * Uses JobFormContext for state, eliminating props drilling.
 */
export const TaskGroupsSection: React.FC = () => {
  const { state, dispatch } = useJobFormContext();
  const { formData, isLoading, isSaving } = state;

  if (!formData) return null;

  const { taskGroups, name: jobName, namespace } = formData;
  const loading = isLoading || isSaving;

  const handleAddTaskGroup = () => {
    const newGroup = {
      ...defaultTaskGroupData,
      name: `${jobName ? jobName + '-' : ''}group-${taskGroups.length + 1}`,
    };
    dispatch(jobFormActions.addTaskGroup(newGroup));
  };

  return (
    <div className="mb-6 border-t pt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Task Groups</h3>
        <button
          type="button"
          onClick={handleAddTaskGroup}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          Add Task Group
        </button>
      </div>

      <div className="space-y-6">
        {taskGroups.map((_, index) => (
          <TaskGroupForm
            key={index}
            groupIndex={index}
            isFirst={index === 0}
            jobName={jobName}
            namespace={namespace}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskGroupsSection;
