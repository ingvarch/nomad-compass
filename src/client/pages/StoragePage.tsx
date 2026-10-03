import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { createNomadClient } from '../lib/api/nomad';
import { withPermissionMessage } from '../lib/errors';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { useHeaderAction } from '../context/HeaderActionContext';
import { PageHeader, RefreshButton, LoadingSpinner, ErrorAlert, Button } from '../components/ui';
import { PluginsTable, VolumesTable } from '../components/storage';
import { RegisterVolumeModal } from '../components/storage/RegisterVolumeModal';
import type { NomadCSIPluginListStub, NomadCSIVolumeListStub, NomadCSIVolumeRegistration } from '../types/csi';

type StorageTab = 'volumes' | 'plugins';

const TABS: { id: StorageTab; label: string }[] = [
  { id: 'volumes', label: 'Volumes' },
  { id: 'plugins', label: 'Plugins' },
];

function useStorageTab(): [StorageTab, (tab: StorageTab) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: StorageTab = searchParams.get('tab') === 'plugins' ? 'plugins' : 'volumes';
  return [tab, (next) => setSearchParams(next === 'volumes' ? {} : { tab: next })];
}

/**
 * CSI volumes of all namespaces and the CSI plugins of the cluster.
 */
export default function StoragePage() {
  const [tab, setTab] = useStorageTab();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const { addToast } = useToast();

  // The plus button of the mobile header
  useHeaderAction(useMemo(() => ({ label: 'Register Volume', onClick: () => setIsRegisterOpen(true) }), []));

  const volumes = useFetch<NomadCSIVolumeListStub[]>(
    () => withPermissionMessage('list-volumes', () => createNomadClient().getCSIVolumes()),
    [],
    { errorMessage: 'Failed to load CSI volumes' }
  );
  const plugins = useFetch<NomadCSIPluginListStub[]>(
    () => withPermissionMessage('read-plugins', () => createNomadClient().getCSIPlugins()),
    [],
    { errorMessage: 'Failed to load CSI plugins' }
  );
  const current = tab === 'volumes' ? volumes : plugins;

  const handleRegister = async (volume: NomadCSIVolumeRegistration) => {
    await createNomadClient().registerCSIVolume(volume);
    addToast(`Volume "${volume.ID}" registered`, 'success');
    setTab('volumes');
    await volumes.refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage"
        description="CSI volumes and the plugins that serve them"
        actions={
          <>
            <RefreshButton onClick={current.refetch} />
            <Button variant="primary" className="shadow-sm hidden sm:inline-flex" onClick={() => setIsRegisterOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Register Volume
            </Button>
          </>
        }
      />

      <div role="tablist" className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              tab === id
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {current.loading && !current.data ? (
        <LoadingSpinner />
      ) : current.error ? (
        <ErrorAlert message={current.error} />
      ) : tab === 'volumes' ? (
        <VolumesTable volumes={volumes.data ?? []} />
      ) : (
        <PluginsTable plugins={plugins.data ?? []} />
      )}

      {isRegisterOpen && (
        <RegisterVolumeModal
          plugins={plugins.data ?? []}
          onClose={() => setIsRegisterOpen(false)}
          onRegister={handleRegister}
        />
      )}
    </div>
  );
}
