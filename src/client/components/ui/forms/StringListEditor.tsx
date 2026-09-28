import { useEffect, useId, useRef } from 'react';
import { Plus, Trash } from 'lucide-react';
import { inputMonoStyles, iconButtonDangerStyles, labelMonokaiStyles, buttonAddRowStyles } from '../../../lib/styles';

interface StringListEditorProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  addLabel: string;
  placeholder?: string;
  helpText?: string;
  minRows?: number;
  disabled?: boolean;
}

/**
 * Editable list of strings, one input per row.
 */
function StringListEditor({
  label,
  values,
  onChange,
  addLabel,
  placeholder = '',
  helpText,
  minRows = 0,
  disabled = false,
}: StringListEditorProps) {
  const labelId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const focusNewRow = useRef(false);

  // Move focus to the row added by the "Add" button
  useEffect(() => {
    if (!focusNewRow.current) return;
    focusNewRow.current = false;
    const inputs = groupRef.current?.querySelectorAll('input');
    inputs?.[inputs.length - 1]?.focus();
  }, [values.length]);

  const replaceAt = (index: number, value: string) => onChange(values.map((v, i) => (i === index ? value : v)));
  const removeAt = (index: number) => onChange(values.filter((_, i) => i !== index));
  const addRow = () => {
    focusNewRow.current = true;
    onChange([...values, '']);
  };

  return (
    <div className="mb-4">
      <div role="group" aria-labelledby={labelId} ref={groupRef}>
        <span id={labelId} className={labelMonokaiStyles}>{label}</span>
        {values.map((value, index) => (
          <div key={index} className="flex gap-2 mb-2 items-center">
            <input
              type="text"
              aria-label={`${label} ${index + 1}`}
              value={value}
              onChange={(e) => replaceAt(index, e.target.value)}
              placeholder={placeholder}
              className={`${inputMonoStyles} min-w-0`}
              disabled={disabled}
            />
            {values.length > minRows && (
              <button
                type="button"
                onClick={() => removeAt(index)}
                className={`flex-shrink-0 ${iconButtonDangerStyles}`}
                disabled={disabled}
                title="Remove"
                aria-label={`Remove ${label} ${index + 1}`}
              >
                <Trash size={16} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addRow} className={buttonAddRowStyles} disabled={disabled}>
          <Plus size={16} />
          {addLabel}
        </button>
      </div>
      {helpText && <p className="mt-1 text-xs text-gray-500 dark:text-monokai-muted">{helpText}</p>}
    </div>
  );
}

export default StringListEditor;
