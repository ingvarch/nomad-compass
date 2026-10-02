import { useSearchParams } from 'react-router-dom';
import type { JobKind } from '../../../lib/services/jobKind';

export type JobTabType =
  | 'overview'
  | 'allocations'
  | 'launches'
  | 'dispatches'
  | 'versions'
  | 'evaluations'
  | 'logs'
  | 'exec';

interface Tab {
  id: JobTabType;
  label: string;
}

// A periodic or parameterized job has no allocations of its own: its runs are the launches or dispatched jobs
const TABS: Record<JobKind, Tab[]> = {
  regular: [
    { id: 'overview', label: 'Overview' },
    { id: 'allocations', label: 'Allocations' },
    { id: 'versions', label: 'Versions' },
    { id: 'evaluations', label: 'Evaluations' },
    { id: 'logs', label: 'Logs' },
    { id: 'exec', label: 'Exec' },
  ],
  periodic: [
    { id: 'overview', label: 'Overview' },
    { id: 'launches', label: 'Launches' },
    { id: 'versions', label: 'Versions' },
    { id: 'evaluations', label: 'Evaluations' },
  ],
  parameterized: [
    { id: 'overview', label: 'Overview' },
    { id: 'dispatches', label: 'Dispatches' },
    { id: 'versions', label: 'Versions' },
    { id: 'evaluations', label: 'Evaluations' },
  ],
};

interface JobDetailTabsProps {
  namespace: string;
  kind?: JobKind;
}

export function JobDetailTabs({ namespace, kind = 'regular' }: JobDetailTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = useActiveJobTab(kind);

  const handleTabChange = (tabId: JobTabType) => {
    const newParams = new URLSearchParams(searchParams);
    if (tabId === 'overview') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tabId);
    }
    // Preserve namespace
    if (namespace && namespace !== 'default') {
      newParams.set('namespace', namespace);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex -mb-px space-x-3 sm:space-x-8 overflow-x-auto no-scrollbar scroll-smooth">
        {TABS[kind].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`py-3.5 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors flex-shrink-0 whitespace-nowrap active:opacity-80 ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

/**
 * Tab from the URL, or the overview when this job has no such tab
 */
export function useActiveJobTab(kind: JobKind): JobTabType {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  return TABS[kind].find(({ id }) => id === tab)?.id ?? 'overview';
}
