/**
 * useJobForm - Main hook for job form management
 *
 * This hook composes smaller focused hooks:
 * - useJobFormFetch: Data loading for edit/clone modes
 * - useJobFormHandlers: Form field change handlers
 * - useJobPlan: Plan preview and job submission
 *
 * All hooks share state via JobFormContext.
 */
import { useJobFormContext } from '../context/JobFormContext';
import { useJobFormFetch } from './useJobFormFetch';
import { useJobFormHandlers } from './useJobFormHandlers';
import { useJobPlan } from './useJobPlan';

// Re-export defaults for backward compatibility
export { defaultTaskGroupData, defaultFormValues } from '../context/JobFormContext';

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
  namespace = 'default',
  cloneFromId,
  cloneNamespace = 'default',
}: UseJobFormOptions) {
  // Get state from context
  const { state } = useJobFormContext();

  // Initialize data fetching
  useJobFormFetch({
    mode,
    jobId,
    namespace,
    cloneFromId,
    cloneNamespace,
  });

  // Get all handlers
  const handlers = useJobFormHandlers({ mode });

  // Get plan/submit functionality
  const plan = useJobPlan({ mode, jobId });

  // Return combined API (backward compatible)
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
    ...handlers,

    // Plan/Submit
    handleSubmit: plan.handleSubmit,
    handlePlan: plan.handlePlan,
    handleSubmitFromPlan: plan.handleSubmitFromPlan,
    closePlanPreview: plan.closePlanPreview,
    deploymentTracker: plan.deploymentTracker,
  };
}
