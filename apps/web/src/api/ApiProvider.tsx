// apps/web/src/api/ApiProvider.tsx
/**
 * ApiProvider - Provides React Query API client to components.
 *
 * Uses ClientEnvironment's config for base URL and token management.
 * Creates a React Query client wrapper with navigation callbacks.
 */

import { toastStore, tokenStore } from '@abe-stack/core';
import { createReactQueryClient } from '@abe-stack/sdk';
import { useNavigate } from '@abe-stack/ui';
import { useClientEnvironment } from '@app';
import { createContext, useContext, useMemo } from 'react';

import type { ReactQueryClientInstance } from '@abe-stack/sdk';
import type { ReactElement, ReactNode } from 'react';

const ApiContext = createContext<ReactQueryClientInstance | null>(null);

/**
 * Hook to access the typed API client.
 * Must be used within ApiProvider (which is inside ClientEnvironmentProvider).
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
 * Must be used within ClientEnvironmentProvider.
 */
export function ApiProvider({ children }: ApiProviderProps): ReactElement {
  const { config } = useClientEnvironment();
  const navigate = useNavigate();

  const api = useMemo<ReactQueryClientInstance>(() => {
    return createReactQueryClient({
      baseUrl: config.apiUrl,
      getToken: () => tokenStore.get(),
      onUnauthorized: () => {
        tokenStore.clear();
        navigate('/login');
      },
      onServerError: (message: string | undefined) => {
        toastStore.getState().show({
          title: 'Server error',
          description: message ?? 'Something went wrong',
        });
      },
    });
  }, [config.apiUrl, navigate]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
