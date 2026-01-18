// apps/web/src/app/AppProvider.tsx
/**
 * AppProvider - Composes all application providers.
 *
 * Provider stack (outer to inner):
 * - PersistQueryClientProvider: Query persistence for offline support
 * - BrowserRouter: React Router infrastructure
 * - ClientEnvironmentProvider: Our unified service context
 * - HistoryProvider: Navigation history tracking
 */

import { HistoryProvider } from '@abe-stack/ui';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { BrowserRouter } from 'react-router-dom';

import { ClientEnvironmentProvider } from './ClientEnvironment';
import { createPersister } from './createEnvironment';

import type { ClientEnvironment } from './ClientEnvironment';
import type { ReactElement, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

interface AppProviderProps {
  /** The client environment containing all services */
  environment: ClientEnvironment;
  /** Child components */
  children?: ReactNode;
}

// ============================================================================
// Persister (created once at module level)
// ============================================================================

const persister = createPersister();

// ============================================================================
// AppProvider
// ============================================================================

/**
 * Root provider that sets up all application infrastructure.
 *
 * Receives the ClientEnvironment as a prop (created in main.tsx).
 * This follows the chet-stack pattern of explicit dependency injection.
 */
export function AppProvider({ environment, children }: AppProviderProps): ReactElement {
  return (
    <PersistQueryClientProvider
      client={environment.queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <BrowserRouter>
        <ClientEnvironmentProvider value={environment}>
          <HistoryProvider>{children}</HistoryProvider>
        </ClientEnvironmentProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}
