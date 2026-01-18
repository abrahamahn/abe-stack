// apps/web/src/app/ClientEnvironment.tsx
/**
 * ClientEnvironment - Single context for all client-side services.
 *
 * Inspired by chet-stack pattern. Benefits:
 * - Single provider instead of nested providers
 * - Explicit dependencies in function signatures
 * - Easy to test (mock one object)
 * - Lazy initialization (services created on first access)
 *
 * This file contains:
 * - ClientEnvironment type definition
 * - AppProvider component (composes all providers internally)
 * - useClientEnvironment hook
 */

import { HistoryProvider } from '@abe-stack/ui';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createContext, useContext } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { createPersister, getClientEnvironment } from './createEnvironment';

import type { ClientConfig } from '@config';
import type { AuthService } from '@features/auth';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ClientEnvironment = {
  /** Application configuration */
  config: ClientConfig;

  /** React Query client for data fetching/caching */
  queryClient: QueryClient;

  /** Authentication service */
  auth: AuthService;

  // Future additions:
  // pubsub: WebSocketPubsubClient;
  // offlineQueue: MutationQueue;
};

// ============================================================================
// Context
// ============================================================================

const ClientEnvironmentContext = createContext<ClientEnvironment | null>(null);

// ============================================================================
// Lazy Initialization
// ============================================================================

// Lazy initialization to avoid circular dependency issues during module loading.
// Environment is created on first access (typically when AppProvider renders).
let _cachedEnvironment: ClientEnvironment | null = null;
let _cachedPersister: ReturnType<typeof createPersister> | null = null;

function getEnvironment(): ClientEnvironment {
  if (!_cachedEnvironment) {
    _cachedEnvironment = getClientEnvironment();
  }
  return _cachedEnvironment;
}

function getPersister(): ReturnType<typeof createPersister> {
  if (!_cachedPersister) {
    _cachedPersister = createPersister();
  }
  return _cachedPersister;
}

// ============================================================================
// AppProvider
// ============================================================================

interface AppProviderProps {
  children?: ReactNode;
}

/**
 * AppProvider - Single provider that sets up the client environment.
 *
 * Composes all necessary providers internally:
 * - PersistQueryClientProvider: Query persistence for offline support
 * - BrowserRouter: React Router infrastructure
 * - ClientEnvironmentContext: Our unified service context
 * - HistoryProvider: Navigation history tracking
 *
 * The ClientEnvironment provides:
 * - config: Application configuration
 * - queryClient: React Query client for data fetching/caching
 * - auth: Authentication service (login, logout, user state)
 */
export function AppProvider({ children }: AppProviderProps): ReactElement {
  const env = getEnvironment();
  const persister = getPersister();

  return (
    <PersistQueryClientProvider
      client={env.queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <BrowserRouter>
        <ClientEnvironmentContext.Provider value={env}>
          <HistoryProvider>{children}</HistoryProvider>
        </ClientEnvironmentContext.Provider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access the ClientEnvironment from any component.
 * Must be used within AppProvider.
 */
export function useClientEnvironment(): ClientEnvironment {
  const env = useContext(ClientEnvironmentContext);
  if (!env) {
    throw new Error('useClientEnvironment must be used within AppProvider');
  }
  return env;
}

// ============================================================================
// Exports
// ============================================================================

/** Direct access to environment for non-React code (lazy initialized) */
export const environment = {
  get current(): ClientEnvironment {
    return getEnvironment();
  },
};

/**
 * Low-level provider for testing.
 * In production, use AppProvider instead.
 */
export function ClientEnvironmentProvider({
  value,
  children,
}: {
  value: ClientEnvironment;
  children: ReactNode;
}): ReactElement {
  return <ClientEnvironmentContext.Provider value={value}>{children}</ClientEnvironmentContext.Provider>;
}
