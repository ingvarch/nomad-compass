/**
 * Links to job pages. Job IDs can contain "/" (periodic launches, dispatched jobs),
 * so the ID is always encoded as one path segment.
 */
export function jobPath(id: string, namespace: string, view?: 'edit'): string {
  const viewSuffix = view ? `/${view}` : '';
  return `/jobs/${encodeURIComponent(id)}${viewSuffix}?namespace=${encodeURIComponent(namespace)}`;
}

export function jobClonePath(id: string, namespace: string): string {
  return `/jobs/create?clone=${encodeURIComponent(id)}&namespace=${encodeURIComponent(namespace)}`;
}
