import { Badge } from '../ui/Badge';
import type { BadgeColorVariant } from '../ui/badgeColors';
import type { CSIHealth } from '../../lib/services/csiService';

const variants: Record<CSIHealth, BadgeColorVariant> = {
  healthy: 'green',
  degraded: 'yellow',
  unschedulable: 'red',
};

export function CSIHealthBadge({ health }: { health: CSIHealth }) {
  return <Badge variant={variants[health]}>{health}</Badge>;
}
