// main/apps/web/src/api/ApiProvider.tsx
import { useClientEnvironment } from '@app';
import { getAccessToken } from '@app/authToken';
import { getApiClient, type ApiClient } from '@bslt/api';
import { createContext, useContext, useMemo } from 'react';

import type { ReactElement, ReactNode } from 'react';

const ApiContext = createContext<ApiClient | null>(null);

/**
 * Hook to access the typed API client.
 * Must be used within ApiProvider (which is inside ClientEnvironmentProvider).
 */
export const useApi = (): ApiClient => {
  const ctx = useContext(ApiContext);
  if (ctx === null) throw new Error('useApi must be used within ApiProvider');
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
 * call site using try-catch. Use isUnauthorizedError() from @bslt/api
 * to check for 401 errors.
 */
export const ApiProvider = ({ children }: ApiProviderProps): ReactElement => {
  const { config } = useClientEnvironment();

  const api = useMemo<ApiClient>(() => {
    return getApiClient({
      baseUrl: config.apiUrl,
      getToken: getAccessToken,
    });
  }, [config.apiUrl]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};
