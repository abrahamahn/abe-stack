// main/client/react/src/oauth/index.ts
/**
 * OAuth React Hooks
 *
 * React hooks and utilities for OAuth authentication.
 */

export {
  getOAuthLoginUrl,
  oauthQueryKeys,
  useEnabledAuthStrategies,
  useEnabledOAuthProviders,
  useOAuthConnections,
} from './hooks';
export type {
  EnabledAuthStrategiesState,
  EnabledOAuthProvidersState,
  OAuthConnectionsState,
} from './hooks';
