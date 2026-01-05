import type { ResourceSummary as ResourceSummaryData } from '../../lib/services/allocationAnalyzer';

interface ResourceSummaryProps {
  data: ResourceSummaryData | null;
  loading?: boolean;
}

function formatValue(value: number, unit: 'MHz' | 'MB'): string {
  if (unit === 'MB' && value >= 1024) {
    return `${(value / 1024).toFixed(1)} GB`;
  }
  if (unit === 'MHz' && value >= 1000) {
    return `${(value / 1000).toFixed(1)} GHz`;
  }
  return `${value} ${unit}`;
}

export function ResourceSummary({ data, loading }: ResourceSummaryProps) {
  if (loading || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36 mb-4" />
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const resources = [
    {
      label: 'CPU',
      allocated: data.allocated.cpu,
      total: data.total.cpu,
      unit: 'MHz' as const,
      colorClass: 'bg-blue-500',
    },
    {
      label: 'Memory',
      allocated: data.allocated.memory,
      total: data.total.memory,
      unit: 'MB' as const,
      colorClass: 'bg-purple-500',
    },
    {
      label: 'Disk',
      allocated: data.allocated.disk,
      total: data.total.disk,
      unit: 'MB' as const,
      colorClass: 'bg-green-500',
    },
  ];

  // Top namespaces by CPU usage
  const topNamespaces = Array.from(data.byNamespace.entries())
    .sort((a, b) => b[1].cpu - a[1].cpu)
    .slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
        Resource Allocation
      </h3>

      <div className="space-y-3">
        {resources.map(({ label, allocated, total, unit, colorClass }) => {
          const percentage = total > 0 ? (allocated / total) * 100 : 0;
          return (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatValue(allocated, unit)} / {formatValue(total, unit)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {topNamespaces.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Top Namespaces
          </h4>
          <div className="space-y-1">
            {topNamespaces.map(([ns, usage]) => (
              <div key={ns} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[60%]">{ns}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatValue(usage.cpu, 'MHz')} / {formatValue(usage.memory, 'MB')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
