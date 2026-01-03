import { createReactQueryClient } from '@abe-stack/api-client';
import { tokenStore } from '@abe-stack/shared';
import { createContext, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { toastStore } from '../features/toast';

import type { ReactQueryClientInstance } from '@abe-stack/api-client';
import type { ReactElement, ReactNode } from 'react';

const ApiContext = createContext<ReactQueryClientInstance | null>(null);

/**
 * Hook to access the typed API client.
 * Must be used within ApiProvider.
 */
export const useApi = (): ReactQueryClientInstance => {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used within ApiProvider');
  return ctx;
};

interface ApiProviderProps {
  children: ReactNode;
}

/**
 * ApiProvider creates a configured API client with auth token management.
 * Must be used within QueryClientProvider (provided by AppProviders).
 */
export function ApiProvider({ children }: ApiProviderProps): ReactElement {
  const navigate = useNavigate();

  const api = useMemo<ReactQueryClientInstance>(() => {
    const env = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env;
    const baseUrl = (env?.VITE_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
    return createReactQueryClient({
      baseUrl,
      getToken: () => tokenStore.get(),
      onUnauthorized: () => {
        tokenStore.clear();
        void navigate('/login');
      },
      onServerError: (message) => {
        toastStore.getState().show({
          title: 'Server error',
          description: message ?? 'Something went wrong',
        });
      },
    });
  }, [navigate]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
