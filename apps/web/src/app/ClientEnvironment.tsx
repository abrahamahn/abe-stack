// apps/web/src/app/ClientEnvironment.tsx
/**
 * ClientEnvironment - Single context for all client-side services.
 *
 * Inspired by chet-stack pattern. Benefits:
 * - Single provider instead of nested providers
 * - Explicit dependencies in function signatures
 * - Easy to test (mock one object)
 *
 * This file contains:
 * - ClientEnvironment type definition
 * - ClientEnvironmentProvider component
 * - useClientEnvironment hook
 */

import { createContext, useContext } from 'react';

import type { QueryCache } from '@abe-stack/sdk';
import type { AuthService } from '@auth/services/AuthService';
import type { ClientConfig } from '@/config';
import type { ReactElement, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ClientEnvironment = {
  /** Application configuration */
  config: ClientConfig;

  /** Query cache for data fetching/caching */
  queryCache: QueryCache;

  /** Authentication service */
  auth: AuthService;

  // Future additions:
  // pubsub: WebSocketPubsubClient;
  // offlineQueue: MutationQueue;
};

// ============================================================================
// Context
// ============================================================================

const ClientEnvironmentContext = createContext<ClientEnvironment | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

/**
 * Low-level provider for the ClientEnvironment.
 *
 * In production, use AppProvider which wraps this with other providers.
 * Use this directly in tests for fine-grained control.
 */
export const ClientEnvironmentProvider = ({
  value,
  children,
}: {
  value: ClientEnvironment;
  children: ReactNode;
}): ReactElement => {
  return (
    <ClientEnvironmentContext.Provider value={value}>{children}</ClientEnvironmentContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Access the ClientEnvironment from any component.
 * Must be used within ClientEnvironmentProvider (or AppProvider).
 */
export function useClientEnvironment(): ClientEnvironment {
  const env = useContext(ClientEnvironmentContext);
  if (env === undefined) {
    throw new Error('useClientEnvironment must be used within ClientEnvironmentProvider');
  }
  return env;
}
