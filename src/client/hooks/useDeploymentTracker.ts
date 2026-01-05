import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createNomadClient } from '../lib/api/nomad';
import {
  DeploymentState,
  DeploymentStep,
  STEP_PROGRESS,
  DEPLOYMENT_STEPS,
} from '../types/deployment';

interface TaskEvent {
  Type: string;
  Time: number;
  Message?: string;
  DisplayMessage?: string;
}

interface TaskState {
  State: string;
  Failed: boolean;
  Events?: TaskEvent[];
}

interface AllocationTaskStates {
  [taskName: string]: TaskState;
}

const POLLING_INTERVAL = 2000; // 2 seconds
const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const SUCCESS_REDIRECT_DELAY = 1500; // 1.5 seconds

interface UseDeploymentTrackerOptions {
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function useDeploymentTracker(options: UseDeploymentTrackerOptions = {}) {
  const navigate = useNavigate();
  const [state, setState] = useState<DeploymentState | null>(null);

  // Use refs to avoid stale closures in interval callback
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const dataRef = useRef<{
    jobId: string;
    namespace: string;
    evalId: string;
    allocId: string | null;
    currentStep: DeploymentStep;
    isComplete: boolean;
  } | null>(null);

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const updateState = useCallback((updates: Partial<DeploymentState>) => {
    setState((prev) => {
      if (!prev) return prev;

      // If updating step, check we're not going backwards
      if (updates.step) {
        const currentIndex = DEPLOYMENT_STEPS.indexOf(prev.step as DeploymentStep);
        const newIndex = DEPLOYMENT_STEPS.indexOf(updates.step);
        if (currentIndex >= 0 && currentIndex >= newIndex) {
          // Don't update step if going backwards
          const { step, ...rest } = updates;
          if (Object.keys(rest).length === 0) return prev;
          return { ...prev, ...rest };
        }
      }

      return { ...prev, ...updates };
    });
  }, []);

  const handleComplete = useCallback(() => {
    if (dataRef.current) {
      dataRef.current.isComplete = true;
    }
    cleanup();

    updateState({ step: 'healthy', progress: STEP_PROGRESS.healthy });

    const data = dataRef.current;
    setTimeout(() => {
      if (data) {
        navigate(`/jobs/${data.jobId}?namespace=${data.namespace}`);
      }
      options.onComplete?.();
    }, SUCCESS_REDIRECT_DELAY);
  }, [cleanup, updateState, navigate, options]);

  const handleError = useCallback((error: string) => {
    if (dataRef.current) {
      dataRef.current.isComplete = true;
    }
    cleanup();
    updateState({ step: 'failed', error });
    options.onError?.(error);
  }, [cleanup, updateState, options]);

  const handleTimeout = useCallback(() => {
    if (dataRef.current) {
      dataRef.current.isComplete = true;
    }
    cleanup();
    updateState({
      step: 'timeout',
      error: 'Deployment is taking longer than expected. The job may still be starting in the background.',
    });
  }, [cleanup, updateState]);

  const poll = useCallback(async () => {
    const data = dataRef.current;
    if (!data || data.isComplete) return;

    // Check timeout
    if (Date.now() - startTimeRef.current > TIMEOUT_MS) {
      handleTimeout();
      return;
    }

    const client = createNomadClient();

    try {
      // Phase 1: Get allocation ID if we don't have one
      if (!data.allocId) {
        const evaluation = await client.getEvaluation(data.evalId);

        if (evaluation.Status === 'blocked') {
          handleError('Evaluation blocked: no nodes available');
          return;
        }

        if (evaluation.Status === 'failed') {
          handleError(`Scheduling failed: ${evaluation.StatusDescription || 'Unknown error'}`);
          return;
        }

        if (evaluation.Status === 'complete') {
          updateState({ step: 'scheduling', progress: STEP_PROGRESS.scheduling });
          data.currentStep = 'scheduling';

          const allocations = await client.getJobAllocations(data.jobId, data.namespace);
          if (allocations && allocations.length > 0) {
            const latestAlloc = allocations.sort(
              (a: { CreateIndex: number }, b: { CreateIndex: number }) => b.CreateIndex - a.CreateIndex
            )[0];
            data.allocId = latestAlloc.ID;
            updateState({ step: 'pulling', progress: STEP_PROGRESS.pulling, allocId: latestAlloc.ID });
            data.currentStep = 'pulling';
          }
        }

        // If still no allocId, wait for next poll
        if (!data.allocId) return;
      }

      // Phase 2: Check allocation status
      const alloc = await client.getAllocation(data.allocId);

      if (alloc.ClientStatus === 'failed') {
        const taskStates = (alloc.TaskStates || {}) as AllocationTaskStates;
        const failedTask = Object.entries(taskStates).find(
          ([, ts]) => ts.State === 'dead' && ts.Failed
        );

        if (failedTask) {
          const [taskName, taskState] = failedTask;
          const lastEvent = taskState.Events?.[taskState.Events.length - 1];
          const errorMsg = lastEvent?.DisplayMessage || lastEvent?.Message || 'Task failed';
          handleError(`Task "${taskName}" failed: ${errorMsg}`);
        } else {
          handleError('Allocation failed');
        }
        return;
      }

      if (alloc.ClientStatus === 'pending') {
        updateState({ step: 'pulling', progress: STEP_PROGRESS.pulling });
        data.currentStep = 'pulling';
        return;
      }

      if (alloc.ClientStatus === 'running') {
        const taskStates = (alloc.TaskStates || {}) as AllocationTaskStates;
        const allTasksRunning = Object.values(taskStates).every(
          (ts) => ts.State === 'running'
        );

        if (allTasksRunning) {
          // Check if healthy (tasks running for 3+ seconds)
          const allTasksHealthy = Object.values(taskStates).every((ts) => {
            const startedEvent = ts.Events?.find((e: TaskEvent) => e.Type === 'Started');
            if (!startedEvent) return false;
            const startedAt = new Date(startedEvent.Time / 1000000).getTime();
            return Date.now() - startedAt > 3000;
          });

          if (allTasksHealthy) {
            handleComplete();
            return;
          }

          updateState({ step: 'starting', progress: STEP_PROGRESS.starting });
          data.currentStep = 'starting';
        } else {
          updateState({ step: 'pulling', progress: STEP_PROGRESS.pulling });
          data.currentStep = 'pulling';
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
      // Don't fail on polling errors, continue polling
    }
  }, [handleComplete, handleError, handleTimeout, updateState]);

  const startTracking = useCallback((jobId: string, namespace: string, evalId: string) => {
    // Clean up any existing tracking
    cleanup();

    // Initialize tracking data
    dataRef.current = {
      jobId,
      namespace,
      evalId,
      allocId: null,
      currentStep: 'submitting',
      isComplete: false,
    };
    startTimeRef.current = Date.now();

    // Set initial state
    setState({
      step: 'submitting',
      jobId,
      namespace,
      evalId,
      progress: STEP_PROGRESS.submitting,
    });

    // Start polling after a short delay
    setTimeout(() => {
      if (dataRef.current && !dataRef.current.isComplete && !pollingRef.current) {
        pollingRef.current = setInterval(poll, POLLING_INTERVAL);
      }
    }, 500);

    // Set up timeout
    timeoutRef.current = setTimeout(handleTimeout, TIMEOUT_MS);
  }, [cleanup, poll, handleTimeout]);

  const stopTracking = useCallback(() => {
    if (dataRef.current) {
      dataRef.current.isComplete = true;
    }
    cleanup();
    setState(null);
    dataRef.current = null;
  }, [cleanup]);

  const navigateToJob = useCallback(() => {
    const data = dataRef.current;
    if (data) {
      navigate(`/jobs/${data.jobId}?namespace=${data.namespace}`);
    }
    stopTracking();
  }, [navigate, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dataRef.current) {
        dataRef.current.isComplete = true;
      }
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    isTracking: state !== null,
    startTracking,
    stopTracking,
    navigateToJob,
  };
}
