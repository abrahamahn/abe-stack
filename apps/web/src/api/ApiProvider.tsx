// apps/web/src/api/ApiProvider.tsx
/**
 * ApiProvider - Provides API client to components.
 *
 * Uses ClientEnvironment's config for base URL and token management.
 * Creates a standalone API client with navigation callbacks.
 */

import { tokenStore } from '@abe-stack/core';
import { createApiClient } from '@abe-stack/sdk';
import { useClientEnvironment } from '@app';
import { createContext, useContext, useMemo } from 'react';

import type { ApiClient } from '@abe-stack/sdk';
import type { ReactElement, ReactNode } from 'react';

const ApiContext = createContext<ApiClient | null>(null);

/**
 * Hook to access the typed API client.
 * Must be used within ApiProvider (which is inside ClientEnvironmentProvider).
 */
export const useApi = (): ApiClient => {
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
 *
 * Note: Error handling (unauthorized, server errors) should be done at the
 * call site using try-catch. Use isUnauthorizedError() from @abe-stack/sdk
 * to check for 401 errors.
 */
export function ApiProvider({ children }: ApiProviderProps): ReactElement {
  const { config } = useClientEnvironment();

  const api = useMemo<ApiClient>(() => {
    return createApiClient({
      baseUrl: config.apiUrl,
      getToken: () => tokenStore.get(),
    });
  }, [config.apiUrl]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
