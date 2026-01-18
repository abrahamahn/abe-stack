// apps/web/src/app/createEnvironment.ts
/**
 * Factory functions to create the ClientEnvironment and related services.
 *
 * Called once at module level in main.tsx to initialize all services.
 * Following chet-stack pattern: services are created before React renders.
 */

import { createQueryPersister } from '@abe-stack/sdk';
import { clientConfig } from '@config';
import { createAuthService } from '@features/auth';
import { QueryClient } from '@tanstack/react-query';

import type { ClientEnvironment } from './ClientEnvironment';

// ============================================================================
// Query Client Configuration
// ============================================================================

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 24 * 60 * 60 * 1000, // 24 hours - required for persistence
        retry: 1,
      },
    },
  });
}

// ============================================================================
// Persister Configuration
// ============================================================================

export function createPersister(): ReturnType<typeof createQueryPersister> {
  return createQueryPersister({
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    throttleTime: 1000, // 1 second
  });
}

// ============================================================================
// Environment Factory
// ============================================================================

/**
 * Create a new ClientEnvironment instance.
 *
 * Call this once in main.tsx and pass the result to AppProvider.
 */
export function createClientEnvironment(): ClientEnvironment {
  const config = clientConfig;
  const queryClient = createQueryClient();

  const auth = createAuthService({
    config,
    queryClient,
  });

  return {
    config,
    queryClient,
    auth,
  };
}
