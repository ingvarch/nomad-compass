import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_NAMESPACE } from '../lib/constants';
import { createNomadClient } from '../lib/api/nomad';
import { getErrorMessage } from '../lib/errors';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, ErrorAlert } from '../components/ui';
import {
  JobHeader,
  JobDetailTabs,
  useActiveJobTab,
  OverviewTab,
  VersionsTab,
  EvaluationsTab,
  LogsTab,
  ExecTab,
  ScheduleCard,
  PeriodicActions,
  LaunchesTab,
} from '../components/jobs/detail';
import JobActions from '../components/jobs/JobActions';
import PermissionErrorModal from '../components/ui/PermissionErrorModal';
import { usePeriodicActions, usePeriodicLaunches } from '../hooks';
import { scheduleState } from '../lib/services/periodicService';
import type { NomadAllocation, NomadServiceRegistration, NomadJob, NomadTaskGroup } from '../types/nomad';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [job, setJob] = useState<NomadJob | null>(null);
  const [allocations, setAllocations] = useState<NomadAllocation[]>([]);
  const [serviceRegistrations, setServiceRegistrations] = useState<NomadServiceRegistration[]>([]);
  const [createTime, setCreateTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedGroupForLogs, setSelectedGroupForLogs] = useState<string | null>(null);

  const jobId = id as string;
  const namespace = searchParams.get('namespace') || DEFAULT_NAMESPACE;

  // A first load shows a spinner and collapses all groups; a refresh keeps the page as it is
  const loadJob = useCallback(async (isFirstLoad: boolean) => {
    if (!isAuthenticated) {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    if (isFirstLoad) setIsLoading(true);
    try {
      const client = createNomadClient();
      // Fetch job, allocations, and versions in parallel
      const [jobDetail, jobAllocations, jobVersions] = await Promise.all([
        client.getJob(jobId, namespace),
        client.getJobAllocations(jobId, namespace),
        client.getJobVersions(jobId, namespace),
      ]);
      setJob(jobDetail);
      setAllocations(jobAllocations || []);

      // Get creation time from the oldest available version
      if (jobVersions?.Versions?.length > 0) {
        const oldestVersion = jobVersions.Versions.reduce((oldest, current) =>
          current.Version < oldest.Version ? current : oldest
        );
        setCreateTime(oldestVersion?.SubmitTime || null);
      }

      if (isFirstLoad && jobDetail.TaskGroups && jobDetail.TaskGroups.length > 0) {
        const initialExpandedState: Record<string, boolean> = {};
        jobDetail.TaskGroups.forEach((group: NomadTaskGroup) => {
          initialExpandedState[group.Name] = false;
          if (group.Tasks) {
            group.Tasks.forEach((task) => {
              initialExpandedState[`${group.Name}-task-${task.Name}`] = false;
            });
          }
        });
        setExpandedGroups(initialExpandedState);
      }

      // Fetch service registrations for each service in the job
      const serviceNames = new Set<string>();
      if (jobDetail.TaskGroups) {
        for (const group of jobDetail.TaskGroups) {
          if (group.Services) {
            for (const service of group.Services) {
              if (service.Name) {
                serviceNames.add(service.Name);
              }
            }
          }
        }
      }

      // Fetch all service registrations in parallel
      if (serviceNames.size > 0) {
        const servicePromises = Array.from(serviceNames).map(name =>
          client.getServiceRegistrations(name, namespace).catch(() => [])
        );
        const serviceResults = await Promise.all(servicePromises);
        const allRegistrations = serviceResults.flat();
        setServiceRegistrations(allRegistrations);
      } else {
        setServiceRegistrations([]);
      }

      setError(null);
    } catch (err) {
      const message = `Failed to load job details: ${getErrorMessage(err)}`;
      if (isFirstLoad) {
        setError(message);
        addToast('Failed to load job details', 'error');
      } else {
        // A failed refresh keeps the page and only reports the error
        addToast(message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, jobId, namespace, addToast]);

  useEffect(() => {
    loadJob(true);
  }, [loadJob]);

  // Header actions stay busy until the page shows the refreshed job
  const refreshJob = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadJob(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadJob]);

  const isPeriodic = !!job?.Periodic;
  const activeTab = useActiveJobTab(isPeriodic);
  const launches = usePeriodicLaunches(jobId, namespace, isPeriodic);
  const periodic = usePeriodicActions(isPeriodic ? job : null, {
    onLaunched: launches.refetch,
    onScheduleChanged: refreshJob,
  });

  const toggleGroupDetails = (groupName: string) => {
    setExpandedGroups({
      ...expandedGroups,
      [groupName]: !expandedGroups[groupName],
    });
  };

  const toggleTaskDetails = (groupName: string, taskName: string) => {
    const key = `${groupName}-task-${taskName}`;
    setExpandedGroups({
      ...expandedGroups,
      [key]: !expandedGroups[key],
    });
  };

  const handleViewLogs = (groupName: string) => {
    setSelectedGroupForLogs(groupName);
    // Switch to logs tab
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'logs');
    setSearchParams(newParams);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} showTitle />;
  }

  if (!job) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 dark:border-yellow-600 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-200">
              Job not found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const periodicState = scheduleState(job);

  return (
    <div className="space-y-6">
      <PermissionErrorModal
        isOpen={!!periodic.permissionError}
        onClose={periodic.clearPermissionError}
        message={periodic.permissionError || ''}
      />

      <JobHeader
        jobName={job.Name || job.ID}
        jobId={job.ID}
        namespace={job.Namespace || DEFAULT_NAMESPACE}
        parentId={job.ParentID}
        actions={
          job.Periodic && (
            <PeriodicActions
              state={periodicState}
              isEnabled={job.Periodic.Enabled}
              isBusy={periodic.isBusy || isRefreshing}
              onRunNow={periodic.runNow}
              onTogglePause={periodic.togglePause}
            />
          )
        }
      />

      <JobDetailTabs namespace={namespace} isPeriodic={isPeriodic} />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          job={job}
          allocations={allocations}
          serviceRegistrations={serviceRegistrations}
          createTime={createTime}
          expandedGroups={expandedGroups}
          onToggleGroup={toggleGroupDetails}
          onToggleTask={toggleTaskDetails}
          // A periodic job has no logs of its own: they are on its launches
          onViewLogs={isPeriodic ? undefined : handleViewLogs}
          schedule={
            job.Periodic && (
              <ScheduleCard
                periodic={job.Periodic}
                state={periodicState}
                nextLaunch={periodic.nextLaunch}
                nextLaunchError={periodic.nextLaunchError}
                lastLaunch={launches.data?.[0]}
                launchesLoading={launches.loading}
                launchesError={launches.error}
              />
            )
          }
        />
      )}

      {activeTab === 'launches' && (
        <LaunchesTab
          launches={launches.data || []}
          loading={launches.loading}
          error={launches.error}
          onRefresh={launches.refetch}
        />
      )}

      {/* Remount on every job change: actions add versions and evaluations */}
      {activeTab === 'versions' && (
        <VersionsTab key={job.JobModifyIndex} jobId={jobId} namespace={namespace} />
      )}

      {activeTab === 'evaluations' && (
        <EvaluationsTab key={job.JobModifyIndex} jobId={jobId} namespace={namespace} />
      )}

      {activeTab === 'logs' && (
        <LogsTab jobId={job.ID} initialTaskGroup={selectedGroupForLogs} />
      )}

      {activeTab === 'exec' && (
        <ExecTab allocations={allocations} namespace={namespace} />
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <div className="flex space-x-4">
          <JobActions
            jobId={job.ID}
            jobStatus={job.Status}
            onStatusChange={refreshJob}
          />
        </div>
        <button
          onClick={() => navigate('/jobs')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back
        </button>
      </div>
    </div>
  );
}
