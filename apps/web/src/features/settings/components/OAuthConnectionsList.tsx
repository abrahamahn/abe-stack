// apps/web/src/features/settings/components/OAuthConnectionsList.tsx
/**
 * OAuth Connections List Component
 *
 * Displays linked OAuth providers and allows connecting/disconnecting.
 */

import {
  useEnabledOAuthProviders,
  useOAuthConnections,
  type ApiClientConfig,
} from '@abe-stack/client';
import { Alert, Button, Card, Skeleton } from '@abe-stack/ui';
import { useMemo, useState, type ReactElement } from 'react';

// ============================================================================
// Local Types (for ESLint type resolution)
// ============================================================================

type OAuthProviderLocal = 'google' | 'github' | 'apple';

interface OAuthConnectionLocal {
  provider: OAuthProviderLocal;
  providerEmail?: string | null;
  connectedAt: Date;
}

// ============================================================================
// Types
// ============================================================================

export interface OAuthConnectionsListProps {
  onSuccess?: () => void;
}

// ============================================================================
// Provider Icons and Names
// ============================================================================

const providerInfo: Record<OAuthProviderLocal, { name: string; icon: string }> = {
  google: { name: 'Google', icon: 'G' },
  github: { name: 'GitHub', icon: 'GH' },
  apple: { name: 'Apple', icon: '' },
};

// ============================================================================
// Component
// ============================================================================

export const OAuthConnectionsList = ({ onSuccess }: OAuthConnectionsListProps): ReactElement => {
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const apiBaseUrl =
    typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';

  // API client config
  const clientConfig = useMemo<ApiClientConfig>(
    () => ({
      baseUrl: apiBaseUrl,
      getToken: (): string | null => localStorage.getItem('accessToken'),
    }),
    [apiBaseUrl],
  );

  // Hooks
  const {
    providers: enabledProviders,
    isLoading: isLoadingProviders,
    error: providersError,
  } = useEnabledOAuthProviders(clientConfig);

  const {
    connections,
    isLoading: isLoadingConnections,
    isActing,
    error: connectionsError,
    unlink,
    getLinkUrl,
  } = useOAuthConnections(clientConfig);

  const handleConnect = (provider: OAuthProviderLocal): void => {
    window.location.href = getLinkUrl(provider);
  };

  const handleDisconnect = async (provider: OAuthProviderLocal): Promise<void> => {
    const info = providerInfo[provider];
    if (!confirm(`Are you sure you want to disconnect ${info.name}?`)) {
      return;
    }

    try {
      setUnlinkError(null);
      await unlink(provider);
      onSuccess?.();
    } catch (err) {
      setUnlinkError(
        err instanceof Error ? err.message : `Failed to disconnect ${info.name}`,
      );
    }
  };

  // Loading state
  if (isLoadingProviders || isLoadingConnections) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  // Error state
  if (providersError !== null || connectionsError !== null) {
    return (
      <Alert tone="danger">
        Failed to load OAuth connections: {providersError?.message ?? connectionsError?.message}
      </Alert>
    );
  }

  // No providers enabled
  if (enabledProviders.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No OAuth providers are configured for this application.
      </p>
    );
  }

  // Build provider list with connection status
  const typedProviders = enabledProviders as OAuthProviderLocal[];
  const typedConnections = connections as OAuthConnectionLocal[];
  const providerList = typedProviders.map((provider: OAuthProviderLocal) => {
    const connection: OAuthConnectionLocal | undefined = typedConnections.find((c: OAuthConnectionLocal) => c.provider === provider);
    return {
      provider,
      connected: connection !== undefined,
      connection,
    };
  });

  return (
    <div className="space-y-3">
      {unlinkError !== null && unlinkError.length > 0 && <Alert tone="danger">{unlinkError}</Alert>}

      {providerList.map(({ provider, connected, connection }) => (
        <ProviderCard
          key={provider}
          provider={provider}
          connected={connected}
          connection={connection ?? null}
          onConnect={() => {
            handleConnect(provider);
          }}
          onDisconnect={() => {
            void handleDisconnect(provider);
          }}
          isDisconnecting={isActing}
        />
      ))}

      {connections.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-2">
          Connect an account for easier sign-in.
        </p>
      )}
    </div>
  );
};

// ============================================================================
// Provider Card Sub-component
// ============================================================================

interface ProviderCardProps {
  provider: OAuthProviderLocal;
  connected: boolean;
  connection: OAuthConnectionLocal | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isDisconnecting: boolean;
}

const ProviderCard = ({
  provider,
  connected,
  connection,
  onConnect,
  onDisconnect,
  isDisconnecting,
}: ProviderCardProps): ReactElement => {
  const info = providerInfo[provider];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-medium">
            {info.icon}
          </div>
          <div>
            <p className="font-medium">{info.name}</p>
            {connected && connection !== null && (
              <p className="text-sm text-gray-500">{connection.providerEmail}</p>
            )}
          </div>
        </div>

        {connected ? (
          <Button
            variant="text"
            size="small"
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        ) : (
          <Button variant="secondary" size="small" onClick={onConnect}>
            Connect
          </Button>
        )}
      </div>
    </Card>
  );
};
