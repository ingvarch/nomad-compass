import { Link } from 'react-router-dom';
import { DataTable, type Column, LoadingSpinner, ErrorAlert, RefreshButton } from '../../ui';
import { StatusBadge } from './StatusBadge';
import { launchAllocationCounts } from '../../../lib/services/periodicService';
import type { ParentJobKind } from '../../../lib/services/jobKind';
import { formatDateLongZoned } from '../../../lib/utils/dateFormatter';
import { jobPath } from '../../../lib/utils/jobPath';
import type { NomadJobListStub } from '../../../types/nomad';

interface LaunchesTabProps {
  // Launches of a periodic job or dispatched jobs of a parameterized one
  kind?: ParentJobKind;
  launches: NomadJobListStub[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const GC_NOTE = 'during garbage collection (job_gc_threshold, 4 hours by default).';

const labels: Record<ParentJobKind, { title: string; time: string; empty: string }> = {
  periodic: {
    title: 'Launches',
    time: 'Launched',
    empty: `No launches yet. Nomad also removes finished launches ${GC_NOTE}`,
  },
  parameterized: {
    title: 'Dispatches',
    time: 'Dispatched',
    empty: `No dispatches yet. Nomad also removes finished dispatched jobs ${GC_NOTE}`,
  },
};

function launchColumns(timeHeader: string): Column<NomadJobListStub>[] {
  return [
    {
      key: 'launched',
      header: timeHeader,
      render: (launch) => (
        <Link
          to={jobPath(launch.ID, launch.Namespace)}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {formatDateLongZoned(launch.SubmitTime)}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (launch) => <StatusBadge status={launch.Status} isStopped={launch.Stop} />,
    },
    {
      key: 'allocations',
      header: 'Allocations',
      render: (launch) => {
        const counts = launchAllocationCounts(launch);
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {counts.running} running, {counts.complete} complete, {counts.failed} failed
          </span>
        );
      },
    },
  ];
}

export function LaunchesTab({ kind = 'periodic', launches, loading, error, onRefresh }: LaunchesTabProps) {
  const { title, time, empty } = labels[kind];

  // A reload keeps the list, so it does not blink at every launch
  if (loading && launches.length === 0) {
    return (
      <div className="py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4">
        <ErrorAlert message={error} />
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title} ({launches.length})</h3>
        <RefreshButton onClick={onRefresh} />
      </div>
      <DataTable
        items={launches}
        columns={launchColumns(time)}
        keyExtractor={(launch) => launch.ID}
        emptyState={{ message: empty }}
      />
    </div>
  );
}
