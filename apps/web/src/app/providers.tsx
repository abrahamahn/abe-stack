// apps/web/src/app/providers.tsx
import { createQueryPersister } from '@abe-stack/sdk';
import { HistoryProvider } from '@abe-stack/ui';
import { ApiProvider } from '@api/index';
import { AuthProvider } from '@auth/index';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { BrowserRouter } from 'react-router-dom';

import type { ReactElement, ReactNode } from 'react';

// Create QueryClient outside component to prevent recreation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours - required for persistence
      retry: 1,
    },
  },
});

// Create persister for offline cache support
const persister = createQueryPersister({
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  throttleTime: 1000, // 1 second
});

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders consolidates all application providers into a single wrapper.
 * Order matters: QueryClient must wrap Auth (which uses useQuery),
 * Auth must wrap Api (which may need auth context).
 * BrowserRouter must wrap ApiProvider (which uses useNavigate).
 */
export function AppProviders({ children }: AppProvidersProps): ReactElement {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <BrowserRouter>
        <AuthProvider>
          <ApiProvider>
            <HistoryProvider>{children}</HistoryProvider>
          </ApiProvider>
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}
