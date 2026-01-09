/**
 * useJobForm - Main hook for job form management
 *
 * This hook composes smaller focused hooks:
 * - useJobFormFetch: Data loading for edit/clone modes
 * - useJobFormHandlers: Job-level field change handlers
 * - useJobPlan: Plan preview and job submission
 *
 * Task group handlers are in useTaskGroupHandlers.ts (used by TaskGroupForm).
 * All hooks share state via JobFormContext.
 */
import { useJobFormContext } from '../context/JobFormContext';
import { useJobFormFetch } from './useJobFormFetch';
import { useJobFormHandlers } from './useJobFormHandlers';
import { useJobPlan } from './useJobPlan';
import { DEFAULT_NAMESPACE } from '../lib/constants';

interface UseJobFormOptions {
  mode: 'create' | 'edit';
  jobId?: string;
  namespace?: string;
  cloneFromId?: string;
  cloneNamespace?: string;
}

export function useJobForm({
  mode,
  jobId,
  namespace = DEFAULT_NAMESPACE,
  cloneFromId,
  cloneNamespace = DEFAULT_NAMESPACE,
}: UseJobFormOptions) {
  const { state } = useJobFormContext();

  useJobFormFetch({
    mode,
    jobId,
    namespace,
    cloneFromId,
    cloneNamespace,
  });

  const { handleInputChange, clearPermissionError } = useJobFormHandlers({ mode });
  const plan = useJobPlan({ mode, jobId });

  return {
    // State
    formData: state.formData,
    initialJob: state.initialJob,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    isLoadingNamespaces: state.isLoadingNamespaces,
    isNameValid: state.isNameValid,
    error: state.error,
    permissionError: state.permissionError,
    success: state.success,
    namespaces: state.namespaces,

    // Plan state
    isPlanning: state.isPlanning,
    showPlanPreview: state.showPlanPreview,
    planResult: state.planResult,
    planError: state.planError,

    // Handlers
    handleInputChange,
    clearPermissionError,

    // Plan/Submit
    handleSubmit: plan.handleSubmit,
    handlePlan: plan.handlePlan,
    handleSubmitFromPlan: plan.handleSubmitFromPlan,
    closePlanPreview: plan.closePlanPreview,
    deploymentTracker: plan.deploymentTracker,
  };
}
