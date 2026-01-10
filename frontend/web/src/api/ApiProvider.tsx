// apps/web/src/api/ApiProvider.tsx
import { toastStore, tokenStore } from '@abe-stack/shared';
import { createReactQueryClient } from '@api-client';
import { config } from '@config';
import { createContext, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ReactQueryClientInstance } from '@api-client';
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

type ApiProviderProps = {
  children: ReactNode;
};

/**
 * ApiProvider creates a configured API client with auth token management.
 * Must be used within QueryClientProvider (provided by AppProviders).
 */
export function ApiProvider({ children }: ApiProviderProps): ReactElement {
  const navigate = useNavigate();

  const api = useMemo<ReactQueryClientInstance>(() => {
    return createReactQueryClient({
      baseUrl: config.apiUrl,
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
