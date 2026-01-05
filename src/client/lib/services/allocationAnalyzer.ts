import type { NomadAllocation } from '../../types/nomad';

// Types for analysis results
export interface AllocationIssue {
  type: 'high_restarts' | 'oom_killed' | 'recent_failure' | 'crash_loop';
  taskName: string;
  details: string;
  timestamp?: number;
}

export interface ProblematicAllocation {
  allocation: NomadAllocation;
  issues: AllocationIssue[];
  severity: 'warning' | 'critical';
}

export interface RecentEvent {
  allocId: string;
  jobId: string;
  namespace: string;
  taskName: string;
  type: string;
  message: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error';
}

// Thresholds
const RESTART_WARNING_THRESHOLD = 3;
const RESTART_CRITICAL_THRESHOLD = 10;
const RECENT_FAILURE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Analyze allocations for stability issues
 */
export function analyzeAllocations(allocations: NomadAllocation[]): ProblematicAllocation[] {
  const problematic: ProblematicAllocation[] = [];

  for (const alloc of allocations) {
    // Only analyze running or pending allocations
    if (alloc.ClientStatus !== 'running' && alloc.ClientStatus !== 'pending') {
      continue;
    }

    const issues: AllocationIssue[] = [];

    if (alloc.TaskStates) {
      for (const [taskName, taskState] of Object.entries(alloc.TaskStates)) {
        // Check high restart count
        const restarts = taskState.Restarts || 0;
        if (restarts >= RESTART_WARNING_THRESHOLD) {
          issues.push({
            type: restarts >= RESTART_CRITICAL_THRESHOLD ? 'crash_loop' : 'high_restarts',
            taskName,
            details: `${restarts} restarts`,
            timestamp: taskState.LastRestart ? new Date(taskState.LastRestart).getTime() : undefined,
          });
        }

        // Check events for OOM kills and recent failures
        if (taskState.Events) {
          for (const event of taskState.Events) {
            // Check for OOM kills (in Details.oom_killed)
            if (event.Details?.oom_killed === 'true') {
              issues.push({
                type: 'oom_killed',
                taskName,
                details: 'Out of memory kill',
                timestamp: event.Time,
              });
            }

            // Check for recent failures
            if (event.FailsTask) {
              const eventTimeMs = event.Time / 1_000_000; // Nomad uses nanoseconds
              const timeSinceEvent = Date.now() - eventTimeMs;

              if (timeSinceEvent < RECENT_FAILURE_WINDOW_MS) {
                issues.push({
                  type: 'recent_failure',
                  taskName,
                  details: event.DisplayMessage || event.Message || 'Task failed',
                  timestamp: event.Time,
                });
              }
            }
          }
        }
      }
    }

    if (issues.length > 0) {
      // Deduplicate issues by type+taskName
      const uniqueIssues = deduplicateIssues(issues);
      const hasCritical = uniqueIssues.some(i => i.type === 'crash_loop' || i.type === 'oom_killed');

      problematic.push({
        allocation: alloc,
        issues: uniqueIssues,
        severity: hasCritical ? 'critical' : 'warning',
      });
    }
  }

  // Sort by severity (critical first), then by most recent issue timestamp
  return problematic.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    const aTime = Math.max(...a.issues.map(i => i.timestamp || 0));
    const bTime = Math.max(...b.issues.map(i => i.timestamp || 0));
    return bTime - aTime;
  });
}

/**
 * Deduplicate issues, keeping only the most recent of each type per task
 */
function deduplicateIssues(issues: AllocationIssue[]): AllocationIssue[] {
  const seen = new Map<string, AllocationIssue>();

  for (const issue of issues) {
    const key = `${issue.type}:${issue.taskName}`;
    const existing = seen.get(key);

    if (!existing || (issue.timestamp || 0) > (existing.timestamp || 0)) {
      seen.set(key, issue);
    }
  }

  return Array.from(seen.values());
}

/**
 * Extract recent events from allocations
 */
export function extractRecentEvents(
  allocations: NomadAllocation[],
  limit: number = 10
): RecentEvent[] {
  const events: RecentEvent[] = [];

  for (const alloc of allocations) {
    if (!alloc.TaskStates) continue;

    for (const [taskName, taskState] of Object.entries(alloc.TaskStates)) {
      for (const event of taskState.Events || []) {
        events.push({
          allocId: alloc.ID,
          jobId: alloc.JobID,
          namespace: alloc.Namespace,
          taskName,
          type: event.Type,
          message: event.DisplayMessage || event.Message || event.Type,
          timestamp: event.Time,
          severity: getSeverity(event.Type, event.FailsTask),
        });
      }
    }
  }

  // Sort by timestamp descending, take limit
  return events
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Determine event severity based on type
 */
function getSeverity(eventType: string, failsTask?: boolean): 'info' | 'warning' | 'error' {
  if (failsTask) return 'error';

  const warningTypes = ['Restarting', 'Failed Restoring Task', 'Killing', 'Signaling'];
  const errorTypes = ['Terminated', 'Driver Failure', 'Setup Failure', 'Sibling Task Failed'];

  if (errorTypes.some(t => eventType.includes(t))) return 'error';
  if (warningTypes.some(t => eventType.includes(t))) return 'warning';

  return 'info';
}

/**
 * Format timestamp to relative time string
 */
export function formatTimeAgo(timestampNs: number): string {
  const ms = Date.now() - timestampNs / 1_000_000;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 10) return `${seconds}s ago`;
  return 'Just now';
}
