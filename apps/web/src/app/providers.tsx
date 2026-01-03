import { HistoryProvider } from '@abe-stack/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '../features/auth/AuthContext';
import { ApiProvider } from '../providers/ApiProvider';

import type { ReactElement, ReactNode } from 'react';

// Create QueryClient outside component to prevent recreation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders consolidates all application providers into a single wrapper.
 * Order matters: QueryClient must wrap Auth (which uses useQuery),
 * Auth must wrap Api (which may need auth context).
 */
export function AppProviders({ children }: AppProvidersProps): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiProvider>
          <HistoryProvider>{children}</HistoryProvider>
        </ApiProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
