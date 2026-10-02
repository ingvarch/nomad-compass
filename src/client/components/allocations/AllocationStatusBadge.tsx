import type { NomadAllocation } from '../../types/nomad';
import { Badge } from '../ui/Badge';
import { getAllocationStatusColor, getStatusClasses } from '../../lib/utils/statusColors';

interface AllocationStatusBadgeProps {
  allocation: NomadAllocation;
}

export function AllocationStatusBadge({ allocation }: AllocationStatusBadgeProps) {
  const statusColors = getAllocationStatusColor(allocation.ClientStatus);

  return (
    <div className="flex items-center gap-1.5">
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClasses(statusColors)}`}>
        {allocation.ClientStatus}
      </span>
      {allocation.DeploymentStatus?.Canary && (
        <Badge variant="purple" size="xs">
          canary
        </Badge>
      )}
    </div>
  );
}
