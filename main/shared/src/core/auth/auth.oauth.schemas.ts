// main/shared/src/core/auth/auth.oauth.schemas.ts
/**
 * @file Auth OAuth Schemas
 * @description OAuth authentication schemas and API contract definitions.
 *   Covers provider flows (initiate, callback), account linking/unlinking,
 *   and connection management.
 * @module Core/Auth
 */

import { createSchema, type Schema } from '../../primitives/schema';
import { OAUTH_PROVIDERS } from '../constants/auth';
import { uuidSchema } from '../schemas';
import { userSchema } from '../users/users.schemas';

import type { User } from '../users/users.schemas';

// ============================================================================
// Types
// ============================================================================

/** OAuth provider type */
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/** OAuth initiate response -- URL to redirect to */
export interface OAuthInitiateResponse {
  url: string;
}

/** OAuth callback query parameters */
export interface OAuthCallbackQuery {
  code?: string | undefined;
  state?: string | undefined;
  error?: string | undefined;
  error_description?: string | undefined;
}

/** OAuth callback response -- auth result */
export interface OAuthCallbackResponse {
  token: string;
  user: User;
  isNewUser: boolean;
}

/** OAuth link response */
export interface OAuthLinkResponse {
  url: string;
}

/** OAuth link callback response */
export interface OAuthLinkCallbackResponse {
  linked: boolean;
  provider: OAuthProvider;
}

/** OAuth unlink response */
export interface OAuthUnlinkResponse {
  message: string;
}

/** OAuth connection info */
export interface OAuthConnection {
  id: string;
  provider: OAuthProvider;
  providerEmail: string | null;
  connectedAt: Date;
}

/** OAuth connections response */
export interface OAuthConnectionsResponse {
  connections: OAuthConnection[];
}

/** Enabled OAuth providers response */
export interface OAuthEnabledProvidersResponse {
  providers: OAuthProvider[];
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * OAuth provider validation schema.
 *
 * @complexity O(1) - constant array lookup
 */
export const oauthProviderSchema: Schema<OAuthProvider> = createSchema((data: unknown) => {
  if (typeof data !== 'string') {
    throw new Error('OAuth provider must be a string');
  }
  if (!OAUTH_PROVIDERS.includes(data as OAuthProvider)) {
    throw new Error(`Invalid OAuth provider. Must be one of: ${OAUTH_PROVIDERS.join(', ')}`);
  }
  return data as OAuthProvider;
});

/** @complexity O(1) */
export const oauthInitiateResponseSchema: Schema<OAuthInitiateResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid OAuth initiate response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['url'] !== 'string' || !isValidUrl(obj['url'])) {
      throw new Error('URL must be a valid URL');
    }
    return { url: obj['url'] };
  },
);

/** @complexity O(1) */
export const oauthCallbackQuerySchema: Schema<OAuthCallbackQuery> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      return {};
    }
    const obj = data as Record<string, unknown>;
    return {
      code: typeof obj['code'] === 'string' ? obj['code'] : undefined,
      state: typeof obj['state'] === 'string' ? obj['state'] : undefined,
      error: typeof obj['error'] === 'string' ? obj['error'] : undefined,
      error_description:
        typeof obj['error_description'] === 'string' ? obj['error_description'] : undefined,
    };
  },
);

/** @complexity O(1) + userSchema.parse */
export const oauthCallbackResponseSchema: Schema<OAuthCallbackResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid OAuth callback response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['token'] !== 'string') {
      throw new Error('Token must be a string');
    }
    if (typeof obj['isNewUser'] !== 'boolean') {
      throw new Error('isNewUser must be a boolean');
    }
    return {
      token: obj['token'],
      user: userSchema.parse(obj['user']),
      isNewUser: obj['isNewUser'],
    };
  },
);

/** @complexity O(1) */
export const oauthLinkResponseSchema: Schema<OAuthLinkResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid OAuth link response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['url'] !== 'string' || !isValidUrl(obj['url'])) {
    throw new Error('URL must be a valid URL');
  }
  return { url: obj['url'] };
});

/** @complexity O(1) */
export const oauthLinkCallbackResponseSchema: Schema<OAuthLinkCallbackResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid OAuth link callback response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['linked'] !== 'boolean') {
      throw new Error('Linked must be a boolean');
    }
    return {
      linked: obj['linked'],
      provider: oauthProviderSchema.parse(obj['provider']),
    };
  },
);

/** @complexity O(1) */
export const oauthUnlinkResponseSchema: Schema<OAuthUnlinkResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid OAuth unlink response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['message'] !== 'string') {
      throw new Error('Message must be a string');
    }
    return { message: obj['message'] };
  },
);

/** @complexity O(1) */
export const oauthConnectionSchema: Schema<OAuthConnection> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid OAuth connection');
  }
  const obj = data as Record<string, unknown>;

  const id = uuidSchema.parse(obj['id']);
  const provider = oauthProviderSchema.parse(obj['provider']);

  let providerEmail: string | null = null;
  if (obj['providerEmail'] !== null && obj['providerEmail'] !== undefined) {
    if (typeof obj['providerEmail'] !== 'string') {
      throw new Error('Provider email must be a string or null');
    }
    providerEmail = obj['providerEmail'];
  }

  let connectedAt: Date;
  if (obj['connectedAt'] instanceof Date) {
    connectedAt = obj['connectedAt'];
  } else if (typeof obj['connectedAt'] === 'string' || typeof obj['connectedAt'] === 'number') {
    connectedAt = new Date(obj['connectedAt']);
    if (isNaN(connectedAt.getTime())) {
      throw new Error('Invalid connectedAt date');
    }
  } else {
    throw new Error('connectedAt must be a date');
  }

  return { id, provider, providerEmail, connectedAt };
});

/** @complexity O(n) where n = connections.length */
export const oauthConnectionsResponseSchema: Schema<OAuthConnectionsResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid OAuth connections response');
    }
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj['connections'])) {
      throw new Error('Connections must be an array');
    }
    return {
      connections: obj['connections'].map((c) => oauthConnectionSchema.parse(c)),
    };
  },
);

/** @complexity O(n) where n = providers.length */
export const oauthEnabledProvidersResponseSchema: Schema<OAuthEnabledProvidersResponse> =
  createSchema((data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid enabled providers response');
    }
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj['providers'])) {
      throw new Error('Providers must be an array');
    }
    return {
      providers: obj['providers'].map((p) => oauthProviderSchema.parse(p)),
    };
  });

// ============================================================================
// Functions
// ============================================================================

/**
 * URL validation helper.
 *
 * @param url - URL string to validate
 * @returns Whether the string is a syntactically valid URL
 * @complexity O(1)
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
