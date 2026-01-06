import { useSearchParams } from 'react-router-dom';

export type JobTabType = 'overview' | 'versions' | 'evaluations' | 'logs';

interface Tab {
  id: JobTabType;
  label: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'versions', label: 'Versions' },
  { id: 'evaluations', label: 'Evaluations' },
  { id: 'logs', label: 'Logs' },
];

interface JobDetailTabsProps {
  namespace: string;
}

export function JobDetailTabs({ namespace }: JobDetailTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as JobTabType) || 'overview';

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
      <nav className="flex -mb-px space-x-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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

export function useActiveJobTab(): JobTabType {
  const [searchParams] = useSearchParams();
  return (searchParams.get('tab') as JobTabType) || 'overview';
}
