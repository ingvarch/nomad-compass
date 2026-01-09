import React, { createContext, useContext, useMemo } from 'react';
import { createNomadClient, NomadClient } from '../lib/api/nomad';

/**
 * Context for sharing a single NomadClient instance across components.
 * This eliminates the need to call createNomadClient() in every component.
 */
const NomadClientContext = createContext<NomadClient | null>(null);

interface NomadClientProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that creates and shares a NomadClient instance.
 * Wrap your app or component tree with this provider.
 */
export function NomadClientProvider({ children }: NomadClientProviderProps) {
  const client = useMemo(() => createNomadClient(), []);

  return (
    <NomadClientContext.Provider value={client}>
      {children}
    </NomadClientContext.Provider>
  );
}

/**
 * Hook to access the shared NomadClient instance.
 * Must be used within a NomadClientProvider.
 *
 * @example
 * function MyComponent() {
 *   const client = useNomadClient();
 *   // Use client.getJobs(), client.getNodes(), etc.
 * }
 */
export function useNomadClient(): NomadClient {
  const client = useContext(NomadClientContext);
  if (!client) {
    throw new Error('useNomadClient must be used within a NomadClientProvider');
  }
  return client;
}
