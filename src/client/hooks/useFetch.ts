import { useState, useEffect, useCallback, DependencyList } from 'react';
import { getErrorMessage } from '../lib/errors';

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for data fetching with loading and error states
 *
 * @param fetchFn - Async function that returns the data
 * @param deps - Dependencies array (refetches when deps change)
 * @param options - Optional configuration
 * @returns Object with data, loading, error states and refetch function
 *
 * @example
 * const { data: nodes, loading, error, refetch } = useFetch(
 *   async () => {
 *     const client = createNomadClient();
 *     return client.getNodes();
 *   },
 *   []
 * );
 */
export function useFetch<T>(
  fetchFn: () => Promise<T>,
  deps: DependencyList = [],
  options: { initialData?: T; errorMessage?: string } = {}
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(options.initialData ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, options.errorMessage));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
