// apps/web/src/app/createEnvironment.ts
/**
 * Factory function to create the ClientEnvironment.
 *
 * Called once at module level in main.tsx to initialize all services.
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

// ============================================================================
// Singleton Instance
// ============================================================================

// Create environment once at module level
// This ensures services are initialized before React renders
let _environment: ClientEnvironment | null = null;

export function getClientEnvironment(): ClientEnvironment {
  if (!_environment) {
    _environment = createClientEnvironment();
  }
  return _environment;
}

// For testing - allows resetting the environment
export function resetClientEnvironment(): void {
  if (_environment) {
    _environment.auth.destroy();
    _environment = null;
  }
}
