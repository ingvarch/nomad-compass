import { useState, useEffect, useCallback } from 'react';
import { createNomadClient, NomadClient } from '../lib/api/nomad';

interface UseNomadDataOptions<T> {
  fetcher: (client: NomadClient) => Promise<T>;
  errorMessage?: string;
  dependencies?: unknown[];
  initialData: T;
}

interface UseNomadDataResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T>>;
}

export function useNomadData<T>({
  fetcher,
  errorMessage = 'Failed to fetch data',
  dependencies = [],
  initialData,
}: UseNomadDataOptions<T>): UseNomadDataResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const client = createNomadClient();
    try {
      const result = await fetcher(client);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : errorMessage);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}
