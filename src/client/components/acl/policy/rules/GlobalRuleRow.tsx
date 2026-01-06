import { PolicyLevel } from '../../../../types/acl';

interface GlobalRuleRowProps {
  label: string;
  description: string;
  value: PolicyLevel | null;
  options: { value: PolicyLevel; label: string }[];
  onChange: (value: PolicyLevel | null) => void;
}

export function GlobalRuleRow({
  label,
  description,
  value,
  options,
  onChange,
}: GlobalRuleRowProps) {
  return (
    <div className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-600 rounded-lg">
      <div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <select
        value={value || ''}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val ? (val as PolicyLevel) : null);
        }}
        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        <option value="">Not set</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
