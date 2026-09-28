import React from 'react';
import { useJobFormContext, jobFormActions } from '../../../../context/JobFormContext';
import type { JobType } from '../../../../types/nomad';
import { labelMonokaiStyles } from '../../../../lib/styles';
import ScheduleSection from './ScheduleSection';

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'service', label: 'Service' },
  { value: 'batch', label: 'Batch' },
];

// Label of a job type; types the form does not offer (sysbatch, system) show as is
function typeLabel(type: string): string {
  return JOB_TYPES.find((option) => option.value === type)?.label ?? type;
}

interface JobTypeSectionProps {
  isEditMode: boolean;
}

/**
 * Job type (segmented control) and, for batch jobs, the schedule.
 * Nomad forbids changing the type or turning the schedule on or off after creation.
 */
const JobTypeSection: React.FC<JobTypeSectionProps> = ({ isEditMode }) => {
  const { state, dispatch } = useJobFormContext();
  const { formData, initialJob, isLoading, isSaving } = state;
  if (!formData) return null;

  const loading = isLoading || isSaving;
  // Periodic sysbatch jobs load as form type 'service' but still show their schedule
  const showSchedule = formData.type === 'batch' || formData.periodic !== null;

  return (
    <div className="mb-4">
      {isEditMode ? (
        <>
          <span className={labelMonokaiStyles}>Job Type</span>
          <p className="text-sm text-gray-900 dark:text-monokai-text">
            {typeLabel(initialJob?.Type ?? formData.type)}
            <span className="ml-2 text-xs text-gray-500 dark:text-monokai-muted">
              Nomad does not allow changing the type of an existing job.
            </span>
          </p>
        </>
      ) : (
        <fieldset>
          <legend className={labelMonokaiStyles}>Job Type</legend>
          <div className="inline-flex rounded-md border border-gray-300 dark:border-monokai-muted overflow-hidden">
            {JOB_TYPES.map(({ value, label }) => (
              <label
                key={value}
                className={`relative w-24 py-1.5 text-center text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-inset has-focus-visible:ring-blue-500 ${
                  formData.type === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-monokai-surface text-gray-700 dark:text-monokai-text hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="jobType"
                  value={value}
                  className="sr-only"
                  checked={formData.type === value}
                  onChange={() => dispatch(jobFormActions.setJobType(value))}
                  disabled={loading}
                />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-monokai-muted">
            Service runs continuously. Batch runs to completion, once or on a schedule.
          </p>
        </fieldset>
      )}

      {showSchedule && (
        <ScheduleSection
          periodic={formData.periodic}
          canToggle={!isEditMode}
          disabled={loading}
          onToggle={(enabled) => dispatch(jobFormActions.setScheduleEnabled(enabled))}
          onChange={(updates) => dispatch(jobFormActions.updatePeriodic(updates))}
        />
      )}
    </div>
  );
};

export default JobTypeSection;
