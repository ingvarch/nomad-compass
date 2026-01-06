import { useState } from 'react';
import { useAclPermissions } from '../hooks/useAclPermissions';
import { LoadingSpinner, ErrorAlert, PageHeader, BackLink } from '../components/ui';
import { PoliciesTab } from '../components/acl/tabs/PoliciesTab';
import { RolesTab } from '../components/acl/tabs/RolesTab';
import { TokensTab } from '../components/acl/tabs/TokensTab';

type TabType = 'policies' | 'roles' | 'tokens';

const TABS: { id: TabType; label: string }[] = [
  { id: 'policies', label: 'Policies' },
  { id: 'roles', label: 'Roles' },
  { id: 'tokens', label: 'Tokens' },
];

export default function AclPage() {
  const [activeTab, setActiveTab] = useState<TabType>('policies');
  const { isLoading, hasManagementAccess, error } = useAclPermissions();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Access Control" description="Manage ACL policies, roles, and tokens" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Access Control" description="Manage ACL policies, roles, and tokens" />

      {/* Error/Warning Banner */}
      {error && <ErrorAlert message={error} />}

      {!hasManagementAccess && !error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-yellow-700 dark:text-yellow-300">
              ACL management requires a management token. Your current token has limited
              access.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        {activeTab === 'policies' && (
          <PoliciesTab hasManagementAccess={hasManagementAccess} />
        )}
        {activeTab === 'roles' && <RolesTab hasManagementAccess={hasManagementAccess} />}
        {activeTab === 'tokens' && (
          <TokensTab hasManagementAccess={hasManagementAccess} />
        )}
      </div>

      <BackLink to="/dashboard" />
    </div>
  );
}
