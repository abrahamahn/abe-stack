// src/client/api/src/oauth/hooks.ts
/**
 * OAuth React Hooks
 *
 * Provides convenient hooks for working with OAuth:
 * - useEnabledOAuthProviders: Get list of enabled OAuth providers
 * - useOAuthConnections: Get/manage connected OAuth accounts
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createApiClient } from '../api/client';
import { API_PREFIX, trimTrailingSlashes } from '../utils';

import type { ApiClientConfig } from '../api/client';
import type { OAuthConnection, OAuthProvider } from '@abe-stack/shared';

// ============================================================================
// Query Keys
// ============================================================================

export const oauthQueryKeys = {
  all: ['oauth'] as const,
  enabledProviders: () => [...oauthQueryKeys.all, 'enabled-providers'] as const,
  connections: () => [...oauthQueryKeys.all, 'connections'] as const,
} as const;

// ============================================================================
// useEnabledOAuthProviders
// ============================================================================

/**
 * Enabled OAuth providers state
 */
export interface EnabledOAuthProvidersState {
  /** Whether loading providers */
  isLoading: boolean;
  /** List of enabled provider names */
  providers: OAuthProvider[];
  /** Error if failed */
  error: Error | null;
  /** Refresh providers from server */
  refresh: () => Promise<void>;
}

/**
 * Hook to get list of enabled OAuth providers (public endpoint)
 *
 * @param clientConfig - API client configuration
 * @returns Enabled providers state
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   const { providers, isLoading } = useEnabledOAuthProviders({
 *     baseUrl: '/api',
 *   });
 *
 *   return (
 *     <div>
 *       {providers.map(provider => (
 *         <OAuthButton key={provider} provider={provider} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEnabledOAuthProviders(
  clientConfig: ApiClientConfig,
): EnabledOAuthProvidersState {
  const [isLoading, setIsLoading] = useState(true);
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createApiClient(clientConfig), [clientConfig]);

  const fetchProviders = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await client.getEnabledOAuthProviders();
      setProviders(response.providers);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch enabled providers'));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void fetchProviders();
  }, [fetchProviders]);

  return {
    isLoading,
    providers,
    error,
    refresh: fetchProviders,
  };
}

// ============================================================================
// useOAuthConnections
// ============================================================================

/**
 * OAuth connections state
 */
export interface OAuthConnectionsState {
  /** Whether loading connections */
  isLoading: boolean;
  /** Whether an action is in progress */
  isActing: boolean;
  /** List of connected OAuth accounts */
  connections: OAuthConnection[];
  /** Error if failed */
  error: Error | null;
  /** Unlink an OAuth provider */
  unlink: (provider: OAuthProvider) => Promise<void>;
  /** Get URL to start OAuth linking flow */
  getLinkUrl: (provider: OAuthProvider) => string;
  /** Refresh connections from server */
  refresh: () => Promise<void>;
}

/**
 * Hook to manage OAuth connections (protected endpoint)
 *
 * @param clientConfig - API client configuration (must include getToken)
 * @returns OAuth connections state and actions
 *
 * @example
 * ```tsx
 * function ConnectedAccountsPage() {
 *   const {
 *     connections,
 *     isLoading,
 *     unlink,
 *     getLinkUrl,
 *   } = useOAuthConnections({
 *     baseUrl: '/api',
 *     getToken: () => token,
 *   });
 *
 *   const handleLink = (provider: OAuthProvider) => {
 *     window.location.href = getLinkUrl(provider);
 *   };
 *
 *   const handleUnlink = async (provider: OAuthProvider) => {
 *     await unlink(provider);
 *   };
 *
 *   return (
 *     <div>
 *       {connections.map(conn => (
 *         <div key={conn.id}>
 *           {conn.provider}: {conn.providerEmail}
 *           <button onClick={() => handleUnlink(conn.provider)}>
 *             Disconnect
 *           </button>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOAuthConnections(clientConfig: ApiClientConfig): OAuthConnectionsState {
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [connections, setConnections] = useState<OAuthConnection[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createApiClient(clientConfig), [clientConfig]);

  const fetchConnections = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await client.getOAuthConnections();
      setConnections(response.connections);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch connections'));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const unlink = useCallback(
    async (provider: OAuthProvider): Promise<void> => {
      try {
        setIsActing(true);
        setError(null);
        await client.unlinkOAuthProvider(provider);
        await fetchConnections();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to unlink provider');
        setError(error);
        throw error;
      } finally {
        setIsActing(false);
      }
    },
    [client, fetchConnections],
  );

  const getLinkUrl = useCallback(
    (provider: OAuthProvider): string => {
      return client.getOAuthLinkUrl(provider);
    },
    [client],
  );

  useEffect(() => {
    void fetchConnections();
  }, [fetchConnections]);

  return {
    isLoading,
    isActing,
    connections,
    error,
    unlink,
    getLinkUrl,
    refresh: fetchConnections,
  };
}

// ============================================================================
// Helper: getOAuthLoginUrl
// ============================================================================

/**
 * Get the URL to initiate OAuth login
 *
 * @param baseUrl - API base URL
 * @param provider - OAuth provider name
 * @returns URL to redirect browser to
 */
export function getOAuthLoginUrl(baseUrl: string, provider: OAuthProvider): string {
  const normalizedBase = trimTrailingSlashes(baseUrl);
  const providerStr = provider as string;
  return `${normalizedBase}${API_PREFIX}/auth/oauth/${providerStr}`;
}
