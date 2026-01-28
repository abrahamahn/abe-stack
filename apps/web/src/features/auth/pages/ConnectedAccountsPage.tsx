// apps/web/src/features/auth/pages/ConnectedAccountsPage.tsx
/**
 * ConnectedAccountsPage - Manage OAuth connected accounts.
 *
 * Features:
 * - View connected OAuth providers (Google, GitHub, Apple)
 * - Connect new OAuth providers
 * - Disconnect existing OAuth providers
 */


import { OAUTH_PROVIDERS, tokenStore, type OAuthConnection, type OAuthProvider } from '@abe-stack/core';
import { getOAuthLoginUrl, useEnabledOAuthProviders, useOAuthConnections } from '@abe-stack/sdk';
import { Button, Card, Dialog, PageContainer } from '@abe-stack/ui';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useMemo, useState } from 'react';

import type { ReactElement } from 'react';

// ============================================================================
// Provider Display Config
// ============================================================================

const PROVIDER_DISPLAY: Record<
  OAuthProvider,
  { label: string; color: string; icon: ReactElement }
> = {
  google: {
    label: 'Google',
    color: '#4285F4',
    icon: (
      <svg viewBox="0 0 24 24" className="connected-account-icon">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  github: {
    label: 'GitHub',
    color: '#333333',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="connected-account-icon">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  apple: {
    label: 'Apple',
    color: '#000000',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="connected-account-icon">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
};

// ============================================================================
// Component
// ============================================================================

export const ConnectedAccountsPage = (): ReactElement => {
  const { config } = useClientEnvironment();
  const [disconnectTarget, setDisconnectTarget] = useState<OAuthConnection | null>(null);

  const clientConfig = useMemo(
    () => ({
      baseUrl: config.apiUrl,
      getToken: (): string | null => tokenStore.get(),
    }),
    [config.apiUrl],
  );

  // Get enabled providers and current connections
  const { providers: enabledProviders, isLoading: providersLoading } =
    useEnabledOAuthProviders(clientConfig);

  const {
    connections,
    isLoading: connectionsLoading,
    isActing,
    unlink,
    refresh,
  } = useOAuthConnections(clientConfig);

  const isLoading = providersLoading || connectionsLoading;

  // Build a map of connected providers
  const connectedProviderMap = useMemo(() => {
    const map = new Map<OAuthProvider, OAuthConnection>();
    for (const conn of connections) {
      map.set(conn.provider, conn);
    }
    return map;
  }, [connections]);

  // Handlers
  const handleConnect = useCallback(
    (provider: OAuthProvider): void => {
      // For linking, we need to use the link endpoint which requires auth
      // The link endpoint is POST /api/auth/oauth/:provider/link which returns a URL
      // However, for simplicity, we'll redirect to the main OAuth URL
      // which will detect the user is already logged in via the state parameter
      const url = getOAuthLoginUrl(config.apiUrl, provider);
      window.location.href = url;
    },
    [config.apiUrl],
  );

  const handleDisconnect = useCallback((connection: OAuthConnection): void => {
    setDisconnectTarget(connection);
  }, []);

  const handleConfirmDisconnect = useCallback(async (): Promise<void> => {
    if (disconnectTarget === null) return;

    try {
      await unlink(disconnectTarget.provider);
      setDisconnectTarget(null);
    } catch {
      // Error is handled by the hook
    }
  }, [disconnectTarget, unlink]);

  // Check if user can disconnect (must have at least one other auth method)
  // For now, we allow disconnect if there's more than one connection
  // In a real app, you'd also check if user has a password set
  const canDisconnect = connections.length > 1;

  // Format date for display
  const formatDate = (date: Date): string =>
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);

  return (
    <PageContainer className="connected-accounts-page">
      <h1 className="connected-accounts-page__title">Connected Accounts</h1>
      <p className="connected-accounts-page__description">
        Connect your social accounts for easier sign-in and account security.
      </p>

      {isLoading ? (
        <Card>
          <Card.Body>Loading connected accounts...</Card.Body>
        </Card>
      ) : (
        <div className="connected-accounts-list">
          {OAUTH_PROVIDERS.map((provider) => {
            const isEnabled = enabledProviders.includes(provider);
            const connection = connectedProviderMap.get(provider);
            const display = PROVIDER_DISPLAY[provider];

            // Don't show providers that aren't enabled
            if (!isEnabled) return null;

            return (
              <Card key={provider} className="connected-account-card">
                <Card.Body>
                  <div className="connected-account-row">
                    <div className="connected-account-info">
                      <div className="connected-account-icon-wrapper">{display.icon}</div>
                      <div className="connected-account-details">
                        <span className="connected-account-name">{display.label}</span>
                        {connection !== undefined ? (
                          <span className="connected-account-email">
                            {connection.providerEmail ?? 'Connected'} &middot; Since{' '}
                            {formatDate(connection.connectedAt)}
                          </span>
                        ) : (
                          <span className="connected-account-status">Not connected</span>
                        )}
                      </div>
                    </div>
                    <div className="connected-account-action">
                      {connection !== undefined ? (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            handleDisconnect(connection);
                          }}
                          disabled={isActing || !canDisconnect}
                          {...(!canDisconnect && {
                            title: 'You must have at least one login method',
                          })}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            handleConnect(provider);
                          }}
                          disabled={isActing}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            );
          })}

          {enabledProviders.length === 0 && (
            <Card>
              <Card.Body>
                <p>No OAuth providers are currently enabled.</p>
              </Card.Body>
            </Card>
          )}
        </div>
      )}

      {/* Refresh button for testing */}
      <div className="connected-accounts-page__actions">
        <Button
          variant="text"
          onClick={() => {
            void refresh();
          }}
          disabled={isLoading || isActing}
        >
          Refresh
        </Button>
      </div>

      {/* Disconnect Confirmation Dialog */}
      <Dialog.Root
        open={disconnectTarget !== null}
        onChange={(open) => {
          if (!open) setDisconnectTarget(null);
        }}
      >
        <Dialog.Content
          title={`Disconnect ${disconnectTarget !== null ? PROVIDER_DISPLAY[disconnectTarget.provider].label : ''}?`}
        >
          <p>
            Are you sure you want to disconnect your{' '}
            {disconnectTarget !== null ? PROVIDER_DISPLAY[disconnectTarget.provider].label : ''}{' '}
            account? You can reconnect it at any time.
          </p>
          {!canDisconnect && (
            <p className="text-danger text-sm">
              You cannot disconnect your only login method. Add a password or connect another
              account first.
            </p>
          )}
          <div className="dialog-actions">
            <Button
              variant="text"
              onClick={() => {
                setDisconnectTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void handleConfirmDisconnect();
              }}
              disabled={isActing || !canDisconnect}
            >
              {isActing ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <style>{`
        .connected-accounts-page {
          max-width: 600px;
        }
        .connected-accounts-page__title {
          font-size: var(--ui-font-size-xl);
          font-weight: var(--ui-font-weight-semibold);
          margin-bottom: var(--ui-gap-xs);
        }
        .connected-accounts-page__description {
          color: var(--ui-color-text-muted);
          margin-bottom: var(--ui-gap-lg);
        }
        .connected-accounts-list {
          display: flex;
          flex-direction: column;
          gap: var(--ui-gap-sm);
        }
        .connected-account-card {
          padding: 0;
        }
        .connected-account-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--ui-gap-md);
        }
        .connected-account-info {
          display: flex;
          align-items: center;
          gap: var(--ui-gap-md);
        }
        .connected-account-icon-wrapper {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--ui-color-surface);
          border-radius: var(--ui-radius-md);
          border: 1px solid var(--ui-color-border);
        }
        .connected-account-icon {
          width: 24px;
          height: 24px;
        }
        .connected-account-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .connected-account-name {
          font-weight: var(--ui-font-weight-medium);
        }
        .connected-account-email {
          font-size: var(--ui-font-size-sm);
          color: var(--ui-color-text-muted);
        }
        .connected-account-status {
          font-size: var(--ui-font-size-sm);
          color: var(--ui-color-text-muted);
        }
        .connected-accounts-page__actions {
          margin-top: var(--ui-gap-md);
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </PageContainer>
  );
};
