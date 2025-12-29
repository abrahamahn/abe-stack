import { createReactQueryClient } from '@abe-stack/api-client';
import { tokenStore } from '@abe-stack/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { toastStore } from '../stores/toastStore';

type ApiContextValue = Record<string, unknown>;

const ApiContext = createContext<ApiContextValue | null>(null);

export const useApi = (): ApiContextValue => {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used within ApiProvider');
  return ctx;
};

type ApiProviderProps = {
  children: React.ReactNode;
};

export function ApiProvider({ children }: ApiProviderProps): React.ReactElement {
  const navigate = useNavigate();
  const [queryClient] = useState(() => new QueryClient());

  const api = useMemo<ApiContextValue>(() => {
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
    }) as ApiContextValue;
  }, [navigate]);

  return (
    <QueryClientProvider client={queryClient}>
      <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
    </QueryClientProvider>
  );
}
