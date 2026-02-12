// src/client/react/src/oauth/hooks.ts
/**
 * OAuth React Hooks
 *
 * Provides convenient hooks for working with OAuth:
 * - useEnabledOAuthProviders: Get list of enabled OAuth providers
 * - useOAuthConnections: Get/manage connected OAuth accounts
 * - getOAuthLoginUrl: Pure function to build OAuth login URL
 */


import { createApiClient } from '@abe-stack/api';
import { API_PREFIX, trimTrailingSlashes } from '@abe-stack/shared';
import { useCallback, useMemo } from 'react';

import { useMutation } from '../query/useMutation';
import { useQuery } from '../query/useQuery';

import type { ApiClientConfig } from '@abe-stack/api';
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
 */
export function useEnabledOAuthProviders(
  clientConfig: ApiClientConfig,
): EnabledOAuthProvidersState {
  const client = useMemo(() => createApiClient(clientConfig), [clientConfig]);

  const query = useQuery({
    queryKey: oauthQueryKeys.enabledProviders(),
    queryFn: () => client.getEnabledOAuthProviders(),
  });

  const handleRefresh = useCallback(async (): Promise<void> => {
    await query.refetch();
  }, [query.refetch]);

  return {
    providers: query.data?.providers ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    refresh: handleRefresh,
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
 */
export function useOAuthConnections(clientConfig: ApiClientConfig): OAuthConnectionsState {
  const client = useMemo(() => createApiClient(clientConfig), [clientConfig]);

  const query = useQuery({
    queryKey: oauthQueryKeys.connections(),
    queryFn: () => client.getOAuthConnections(),
  });

  const unlinkMutation = useMutation({
    mutationFn: (provider: OAuthProvider) => client.unlinkOAuthProvider(provider),
    invalidateOnSuccess: [oauthQueryKeys.connections()],
  });

  const handleUnlink = useCallback(
    async (provider: OAuthProvider): Promise<void> => {
      await unlinkMutation.mutateAsync(provider);
    },
    [unlinkMutation.mutateAsync],
  );

  const getLinkUrl = useCallback(
    (provider: OAuthProvider): string => {
      return client.getOAuthLinkUrl(provider);
    },
    [client],
  );

  const handleRefresh = useCallback(async (): Promise<void> => {
    await query.refetch();
  }, [query.refetch]);

  return {
    connections: query.data?.connections ?? [],
    isLoading: query.isLoading,
    isActing: unlinkMutation.isPending,
    error: query.error ?? unlinkMutation.error ?? null,
    unlink: handleUnlink,
    getLinkUrl,
    refresh: handleRefresh,
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
