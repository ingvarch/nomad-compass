import React, { useState } from 'react';
import type { NomadDeployment } from '../../../types/deployment';
import { Badge, Button, ConfirmationDialog } from '../../ui';
import { Rocket, CheckCircle, Pause, Play, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface DeploymentCardProps {
  deployment: NomadDeployment | null;
  onPromote: (options?: { all?: boolean; groups?: string[] }) => Promise<void>;
  onPause?: (pause: boolean) => Promise<void>;
  onFail?: () => Promise<void>;
  isBusy?: boolean;
}

export const DeploymentCard: React.FC<DeploymentCardProps> = ({
  deployment,
  onPromote,
  onPause,
  onFail,
  isBusy = false,
}) => {
  const [isPromoteConfirmOpen, setIsPromoteConfirmOpen] = useState(false);
  const [isFailConfirmOpen, setIsFailConfirmOpen] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [promotingGroup, setPromotingGroup] = useState<string | null>(null);

  if (!deployment || !deployment.ID) return null;

  const status = deployment.Status;
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isActive = isRunning || isPaused;

  const groups = Object.entries(deployment.TaskGroups || {});

  // Check if any group has canaries awaiting promotion
  const unpromotedGroups = groups.filter(
    ([, g]) => g.DesiredCanaries > 0 && !g.Promoted
  );
  const hasUnpromotedCanaries = unpromotedGroups.length > 0;
  const canPromote = isActive && hasUnpromotedCanaries;

  const getStatusBadgeVariant = (s: string): 'blue' | 'green' | 'red' | 'yellow' | 'gray' => {
    switch (s) {
      case 'successful':
        return 'green';
      case 'running':
        return 'blue';
      case 'failed':
        return 'red';
      case 'paused':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const handlePromoteAll = async () => {
    setIsPromoteConfirmOpen(false);
    await onPromote({ all: true });
  };

  const handlePromoteSingleGroup = async (groupName: string) => {
    setPromotingGroup(groupName);
    try {
      await onPromote({ all: false, groups: [groupName] });
    } finally {
      setPromotingGroup(null);
    }
  };

  const handleFailConfirm = async () => {
    setIsFailConfirmOpen(false);
    if (onFail) {
      await onFail();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Deployment
              </h3>
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400" title={deployment.ID}>
                {deployment.ID.slice(0, 8)}
              </span>
              <Badge variant={getStatusBadgeVariant(status)} size="sm">
                {status}
              </Badge>
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                v{deployment.JobVersion}
              </span>
            </div>
            {deployment.StatusDescription && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {deployment.StatusDescription}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
          {canPromote && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsPromoteConfirmOpen(true)}
              disabled={isBusy}
              className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-500"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Promote Canaries
            </Button>
          )}

          {isRunning && onPause && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onPause(true)}
              disabled={isBusy}
              title="Pause deployment rollout"
            >
              <Pause className="w-3.5 h-3.5 mr-1" /> Pause
            </Button>
          )}

          {isPaused && onPause && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onPause(false)}
              disabled={isBusy}
              title="Resume deployment rollout"
            >
              <Play className="w-3.5 h-3.5 mr-1" /> Resume
            </Button>
          )}

          {isActive && onFail && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setIsFailConfirmOpen(true)}
              disabled={isBusy}
              title="Manually fail deployment and revert"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> Fail
            </Button>
          )}

          <button
            type="button"
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title={isDetailsExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isDetailsExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Task Group Rollout Details */}
      {isDetailsExpanded && groups.length > 0 && (
        <div className="p-4 sm:p-5 divide-y divide-gray-100 dark:divide-gray-700/60">
          {groups.map(([name, tg]) => {
            const hasCanaryConfig = tg.DesiredCanaries > 0;
            const canPromoteGroup = isActive && hasCanaryConfig && !tg.Promoted;
            const isGroupBusy = isBusy || promotingGroup === name;

            return (
              <div
                key={name}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white font-mono">
                      {name}
                    </span>
                    {hasCanaryConfig ? (
                      tg.Promoted ? (
                        <Badge variant="green" size="sm">
                          Canaries Promoted
                        </Badge>
                      ) : tg.HealthyAllocs >= tg.DesiredCanaries ? (
                        <Badge variant="yellow" size="sm">
                          Awaiting Promotion ({tg.HealthyAllocs}/{tg.DesiredCanaries} healthy)
                        </Badge>
                      ) : (
                        <Badge variant="blue" size="sm">
                          Canaries Starting ({tg.HealthyAllocs}/{tg.DesiredCanaries})
                        </Badge>
                      )
                    ) : (
                      <Badge variant="gray" size="sm">
                        Standard Rollout
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4 flex-wrap">
                    {hasCanaryConfig && (
                      <span>
                        Canaries: <strong>{tg.HealthyAllocs}</strong> healthy / <strong>{tg.DesiredCanaries}</strong> desired
                      </span>
                    )}
                    <span>
                      Allocations: <strong>{tg.PlacedAllocs}</strong> placed / <strong>{tg.DesiredTotal}</strong> total
                    </span>
                    {tg.UnhealthyAllocs > 0 && (
                      <span className="text-red-500 font-semibold">
                        {tg.UnhealthyAllocs} unhealthy
                      </span>
                    )}
                  </div>
                </div>

                {canPromoteGroup && unpromotedGroups.length > 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePromoteSingleGroup(name)}
                    disabled={isGroupBusy}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-green-500" />
                    Promote Group
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Promote */}
      <ConfirmationDialog
        isOpen={isPromoteConfirmOpen}
        onClose={() => setIsPromoteConfirmOpen(false)}
        onConfirm={handlePromoteAll}
        title="Promote Canary Deployment"
        confirmLabel="Promote Canaries"
        mode="confirm"
        message={
          <div>
            Are you sure you want to promote the canary allocations for deployment{' '}
            <strong className="font-mono text-gray-900 dark:text-white">
              {deployment.ID.slice(0, 8)}
            </strong>
            ? This signals to Nomad that the canaries are healthy and starts the rolling upgrade
            for all remaining allocations in this job.
          </div>
        }
      />

      {/* Confirmation Dialog for Fail */}
      <ConfirmationDialog
        isOpen={isFailConfirmOpen}
        onClose={() => setIsFailConfirmOpen(false)}
        onConfirm={handleFailConfirm}
        title="Fail Deployment"
        mode="delete"
        confirmLabel="Fail Deployment"
        message={
          <div>
            Are you sure you want to mark deployment{' '}
            <strong className="font-mono text-gray-900 dark:text-white">
              {deployment.ID.slice(0, 8)}
            </strong>{' '}
            as failed? This will abort the current rollout and may trigger an automatic rollback to
            the previous healthy version if auto_revert is enabled.
          </div>
        }
      />
    </div>
  );
};
