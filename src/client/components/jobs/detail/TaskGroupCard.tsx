import React from 'react';
import ExpandIcon from '../../ui/ExpandIcon';
import NetworkTable from './NetworkTable';
import HealthCheckTable from './HealthCheckTable';
import EnvironmentVariableDisplay from '../EnvironmentVariableDisplay';

interface TaskGroupCardProps {
  taskGroup: any;
  isExpanded: boolean;
  isContainerExpanded: boolean;
  onToggle: () => void;
  onToggleContainer: () => void;
  onViewLogs: () => void;
}

export const TaskGroupCard: React.FC<TaskGroupCardProps> = ({
  taskGroup,
  isExpanded,
  isContainerExpanded,
  onToggle,
  onToggleContainer,
  onViewLogs,
}) => {
  const task = taskGroup.Tasks?.[0];

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div
        className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center cursor-pointer"
        onClick={onToggle}
      >
        <ExpandIcon isExpanded={isExpanded} className="mr-2" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Task Group: {taskGroup.Name}
          <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
            Count: {taskGroup.Count}
          </span>
        </h3>
      </div>

      {isExpanded && (
        <div className="p-6">
          {taskGroup.Networks && <NetworkTable networks={taskGroup.Networks} />}
          {taskGroup.Services && <HealthCheckTable services={taskGroup.Services} />}

          {task && (
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                Container
              </h4>
              <div className="border dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 mt-2">
                <div
                  className="p-4 flex justify-between items-center cursor-pointer bg-gray-50 dark:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleContainer();
                  }}
                >
                  <div className="flex items-center">
                    <ExpandIcon isExpanded={isContainerExpanded} />
                    <h5 className="text-md font-medium text-gray-900 dark:text-white ml-2">
                      {task.Name}
                    </h5>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="px-3 py-1 text-xs font-medium rounded-full bg-blue-600 text-white hover:bg-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewLogs();
                      }}
                    >
                      View Logs
                    </button>
                  </div>
                </div>

                {isContainerExpanded && (
                  <div className="p-4 border-t dark:border-gray-700">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Task Details */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                        <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Task Details
                        </h6>
                        <dl className="divide-y divide-gray-200 dark:divide-gray-600">
                          <div className="py-2 grid grid-cols-2">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Name
                            </dt>
                            <dd className="text-sm text-gray-900 dark:text-white">
                              {task.Name}
                            </dd>
                          </div>
                          <div className="py-2 grid grid-cols-2">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Driver
                            </dt>
                            <dd className="text-sm text-gray-900 dark:text-white">
                              {task.Driver}
                            </dd>
                          </div>
                          <div className="py-2 grid grid-cols-2">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Image
                            </dt>
                            <dd className="text-sm text-gray-900 dark:text-white break-words">
                              {task.Config?.image || '-'}
                            </dd>
                          </div>
                          {task.Leader && (
                            <div className="py-2 grid grid-cols-2">
                              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Leader
                              </dt>
                              <dd className="text-sm text-gray-900 dark:text-white">
                                Yes
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Resources */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                        <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Resources
                        </h6>
                        <dl className="divide-y divide-gray-200 dark:divide-gray-600">
                          <div className="py-2 grid grid-cols-2">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              CPU
                            </dt>
                            <dd className="text-sm text-gray-900 dark:text-white">
                              {task.Resources?.CPU || 0} MHz
                            </dd>
                          </div>
                          <div className="py-2 grid grid-cols-2">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Memory
                            </dt>
                            <dd className="text-sm text-gray-900 dark:text-white">
                              {task.Resources?.MemoryMB || 0} MB
                            </dd>
                          </div>
                          <div className="py-2 grid grid-cols-2">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Disk
                            </dt>
                            <dd className="text-sm text-gray-900 dark:text-white">
                              {task.Resources?.DiskMB || 0} MB
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {/* Environment Variables */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                        <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Environment Variables
                        </h6>
                        {task.Env && Object.keys(task.Env).length > 0 ? (
                          <EnvironmentVariableDisplay envVars={task.Env} />
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No environment variables defined
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Additional Configuration */}
                    {task.Config &&
                      Object.keys(task.Config).filter(
                        (key) => key !== 'image' && key !== 'auth'
                      ).length > 0 && (
                        <div className="mt-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                          <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Additional Configuration
                          </h6>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-600 p-3 rounded overflow-auto max-h-40 text-gray-900 dark:text-gray-100">
                            {JSON.stringify(
                              Object.entries(task.Config)
                                .filter(([key]) => key !== 'image' && key !== 'auth')
                                .reduce(
                                  (obj, [key, value]) => ({ ...obj, [key]: value }),
                                  {}
                                ),
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskGroupCard;
