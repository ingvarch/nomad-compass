import React, { useMemo } from 'react';
import type { PeriodicFormData } from '../../../../types/nomad';
import FormInputField from '../../../ui/forms/FormInputField';
import StringListEditor from '../../../ui/forms/StringListEditor';

interface ScheduleSectionProps {
  periodic: PeriodicFormData | null;
  canToggle: boolean;
  disabled: boolean;
  onToggle: (enabled: boolean) => void;
  onChange: (updates: Partial<PeriodicFormData>) => void;
}

const TIME_ZONES_LIST_ID = 'schedule-time-zones';

/**
 * Cron schedule of a batch job (Nomad `periodic` block).
 */
const ScheduleSection: React.FC<ScheduleSectionProps> = ({ periodic, canToggle, disabled, onToggle, onChange }) => {
  const timeZones = useMemo(() => Intl.supportedValuesOf('timeZone'), []);

  return (
    <div className="mt-4 border rounded-lg p-4 bg-gray-50 dark:bg-monokai-bg dark:border-monokai-muted">
      <FormInputField
        id="schedule-enabled"
        name="scheduleEnabled"
        label="Run on a schedule"
        type="checkbox"
        value={periodic !== null}
        onChange={(e) => onToggle((e.target as HTMLInputElement).checked)}
        disabled={disabled || !canToggle}
        helpText={
          canToggle
            ? 'Nomad launches a new run of this job at each scheduled time.'
            : 'Nomad does not allow turning the schedule on or off for an existing job.'
        }
      />

      {periodic && (
        <div className="mt-4">
          <StringListEditor
            label="Cron expressions"
            values={periodic.crons}
            onChange={(crons) => onChange({ crons })}
            addLabel="Add Expression"
            placeholder="0 3 * * *"
            minRows={1}
            disabled={disabled}
            helpText="Cron syntax with 5 or 6 fields, or @hourly, @daily, @weekly. With several expressions the job runs at the earliest match."
          />
          <FormInputField
            id="schedule-time-zone"
            name="timeZone"
            label="Time zone"
            type="text"
            value={periodic.timeZone}
            onChange={(e) => onChange({ timeZone: e.target.value })}
            placeholder="UTC"
            list={TIME_ZONES_LIST_ID}
            disabled={disabled}
          />
          <datalist id={TIME_ZONES_LIST_ID}>
            {timeZones.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
          <FormInputField
            id="schedule-prohibit-overlap"
            name="prohibitOverlap"
            label="Don't start a new run while the previous one is running"
            type="checkbox"
            value={periodic.prohibitOverlap}
            onChange={(e) => onChange({ prohibitOverlap: (e.target as HTMLInputElement).checked })}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

export default ScheduleSection;
