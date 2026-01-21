// apps/server/src/modules/auth/oauth/service.ts
/**
 * OAuth Service
 *
 * Business logic for OAuth authentication flows.
 * Handles provider management, account linking, and user creation.
 */

import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto';

import {
  oauthConnections,
  users,
  withTransaction,
  type DbClient,
  type OAuthProvider,
  type UserRole,
} from '@infrastructure';
import {
  ConflictError,
  EmailAlreadyExistsError,
  NotFoundError,
  OAuthError,
  OAuthStateMismatchError,
} from '@shared';
import { and, eq } from 'drizzle-orm';

import { createAccessToken, createRefreshTokenFamily } from '../utils';

import {
  createAppleProvider,
  createGitHubProvider,
  createGoogleProvider,
  extractAppleUserFromIdToken,
} from './providers';

import type {
  OAuthConnectionInfo,
  OAuthProviderClient,
  OAuthState,
  OAuthTokenResponse,
  OAuthUserInfo,
} from './types';
import type { AuthConfig, OAuthProviderConfig } from '@config';

// ============================================================================
// Types
// ============================================================================

export interface OAuthAuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  };
  isNewUser: boolean;
}

export interface OAuthCallbackResult {
  /** Authentication result if successful */
  auth?: OAuthAuthResult;
  /** True if this was a link operation */
  isLinking: boolean;
  /** True if account was linked (for link operations) */
  linked?: boolean;
}

// ============================================================================
// Token Encryption
// ============================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Encrypt a token for storage
 */
function encryptToken(token: string, encryptionKey: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(encryptionKey, salt, 32);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: salt:iv:tag:encrypted (all base64)
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a stored token
 */
function decryptToken(encryptedData: string, encryptionKey: string): string {
  const [saltB64, ivB64, tagB64, encryptedB64] = encryptedData.split(':');

  if (!saltB64 || !ivB64 || !tagB64 || !encryptedB64) {
    throw new Error('Invalid encrypted token format');
  }

  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');

  const key = scryptSync(encryptionKey, salt, 32);
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// ============================================================================
// State Management
// ============================================================================

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Create OAuth state for CSRF protection
 */
export function createOAuthState(
  provider: OAuthProvider,
  redirectUri: string,
  isLinking: boolean,
  userId?: string,
): OAuthState {
  return {
    state: randomBytes(32).toString('hex'),
    provider,
    redirectUri,
    isLinking,
    userId,
    createdAt: Date.now(),
  };
}

/**
 * Encode OAuth state for URL parameter
 */
export function encodeOAuthState(state: OAuthState, encryptionKey: string): string {
  const json = JSON.stringify(state);
  return encryptToken(json, encryptionKey);
}

/**
 * Decode and validate OAuth state
 */
export function decodeOAuthState(encoded: string, encryptionKey: string): OAuthState {
  try {
    const json = decryptToken(encoded, encryptionKey);
    const state = JSON.parse(json) as OAuthState;

    // Check expiry
    if (Date.now() - state.createdAt > STATE_EXPIRY_MS) {
      throw new OAuthStateMismatchError(state.provider);
    }

    return state;
  } catch (error) {
    if (error instanceof OAuthStateMismatchError) {
      throw error;
    }
    throw new OAuthStateMismatchError('unknown');
  }
}

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Get OAuth provider client for the given provider
 */
export function getProviderClient(
  provider: OAuthProvider,
  config: AuthConfig,
): OAuthProviderClient {
  const providerConfig = config.oauth[provider as keyof typeof config.oauth];

  if (!providerConfig) {
    throw new OAuthError(
      `OAuth provider ${provider} is not configured`,
      provider,
      'NOT_CONFIGURED',
    );
  }

  switch (provider) {
    case 'google':
      return createGoogleProvider(
        (providerConfig as OAuthProviderConfig).clientId,
        (providerConfig as OAuthProviderConfig).clientSecret,
      );
    case 'github':
      return createGitHubProvider(
        (providerConfig as OAuthProviderConfig).clientId,
        (providerConfig as OAuthProviderConfig).clientSecret,
      );
    case 'apple': {
      // Apple requires additional configuration
      const appleConfig = providerConfig as OAuthProviderConfig & {
        teamId?: string;
        keyId?: string;
        privateKey?: string;
      };

      if (!appleConfig.teamId || !appleConfig.keyId || !appleConfig.privateKey) {
        throw new OAuthError(
          'Apple OAuth requires teamId, keyId, and privateKey configuration',
          'apple',
          'INCOMPLETE_CONFIG',
        );
      }

      return createAppleProvider({
        clientId: appleConfig.clientId,
        teamId: appleConfig.teamId,
        keyId: appleConfig.keyId,
        privateKey: appleConfig.privateKey,
      });
    }
    default: {
      const exhaustiveCheck: never = provider;
      throw new OAuthError(
        `Unsupported OAuth provider: ${String(exhaustiveCheck)}`,
        provider,
        'UNSUPPORTED',
      );
    }
  }
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Generate authorization URL for OAuth flow
 */
export function getAuthorizationUrl(
  provider: OAuthProvider,
  config: AuthConfig,
  redirectUri: string,
  isLinking: boolean,
  userId?: string,
): { url: string; state: string } {
  const client = getProviderClient(provider, config);
  const stateObj = createOAuthState(provider, redirectUri, isLinking, userId);
  const encodedState = encodeOAuthState(stateObj, config.cookie.secret);

  const url = client.getAuthorizationUrl(encodedState, redirectUri);

  return { url, state: encodedState };
}

/**
 * Handle OAuth callback - exchange code for tokens and authenticate/link user
 */
export async function handleOAuthCallback(
  db: DbClient,
  config: AuthConfig,
  provider: OAuthProvider,
  code: string,
  state: string,
  redirectUri: string,
): Promise<OAuthCallbackResult> {
  // Decode and validate state
  const stateObj = decodeOAuthState(state, config.cookie.secret);

  if (stateObj.provider !== provider) {
    throw new OAuthStateMismatchError(provider);
  }

  // Get provider client and exchange code
  const client = getProviderClient(provider, config);
  const tokens = await client.exchangeCode(code, redirectUri);

  // Get user info from provider
  let userInfo: OAuthUserInfo;
  if (provider === 'apple') {
    // Apple: user info is in the id_token, pass it to getUserInfo
    // The tokens response should include id_token for Apple
    const appleTokens = tokens as OAuthTokenResponse & { idToken?: string };
    if (!appleTokens.accessToken) {
      throw new OAuthError('Apple OAuth did not return id_token', 'apple', 'NO_ID_TOKEN');
    }
    // For Apple, we need to get id_token from the exchange response
    // In the actual flow, we'd need to modify exchangeCode to return id_token
    // For now, we'll assume the service layer handles this
    userInfo = extractAppleUserFromIdToken(appleTokens.accessToken);
  } else {
    userInfo = await client.getUserInfo(tokens.accessToken);
  }

  // Handle linking vs authentication
  if (stateObj.isLinking && stateObj.userId) {
    await linkOAuthAccount(db, config, stateObj.userId, provider, userInfo, tokens);
    return { isLinking: true, linked: true };
  }

  // Authenticate or create user
  const auth = await authenticateOrCreateWithOAuth(db, config, provider, userInfo, tokens);
  return { auth, isLinking: false };
}

/**
 * Authenticate existing user or create new user from OAuth
 */
async function authenticateOrCreateWithOAuth(
  db: DbClient,
  config: AuthConfig,
  provider: OAuthProvider,
  userInfo: OAuthUserInfo,
  tokens: OAuthTokenResponse,
): Promise<OAuthAuthResult> {
  const encryptionKey = config.cookie.secret;

  // Check if OAuth connection already exists
  const existingConnection = await db.query.oauthConnections.findFirst({
    where: and(
      eq(oauthConnections.provider, provider),
      eq(oauthConnections.providerUserId, userInfo.id),
    ),
  });

  if (existingConnection) {
    // Update tokens and return existing user
    await db
      .update(oauthConnections)
      .set({
        accessToken: encryptToken(tokens.accessToken, encryptionKey),
        refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken, encryptionKey) : null,
        expiresAt: tokens.expiresAt,
        providerEmail: userInfo.email,
        updatedAt: new Date(),
      })
      .where(eq(oauthConnections.id, existingConnection.id));

    const user = await db.query.users.findFirst({
      where: eq(users.id, existingConnection.userId),
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create auth tokens
    const accessToken = createAccessToken(
      user.id,
      user.email,
      user.role,
      config.jwt.secret,
      config.jwt.accessTokenExpiry,
    );

    const { token: refreshToken } = await createRefreshTokenFamily(
      db,
      user.id,
      config.refreshToken.expiryDays,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      isNewUser: false,
    };
  }

  // Check if email already exists (for a different user)
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, userInfo.email),
  });

  if (existingUser) {
    // Email exists but no OAuth connection - user should link their account
    throw new EmailAlreadyExistsError(
      `An account with email ${userInfo.email} already exists. Please log in and link your ${provider} account.`,
    );
  }

  // Create new user with OAuth connection
  const result = await withTransaction(db, async (tx) => {
    // Create user (verified if provider verified email)
    const [newUser] = await tx
      .insert(users)
      .values({
        email: userInfo.email,
        name: userInfo.name,
        // OAuth users don't have a password - generate a random unusable hash
        passwordHash: `oauth:${provider}:${randomBytes(32).toString('hex')}`,
        role: 'user',
        emailVerified: userInfo.emailVerified,
        emailVerifiedAt: userInfo.emailVerified ? new Date() : null,
      })
      .returning();

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    // Create OAuth connection
    await tx.insert(oauthConnections).values({
      userId: newUser.id,
      provider,
      providerUserId: userInfo.id,
      providerEmail: userInfo.email,
      accessToken: encryptToken(tokens.accessToken, encryptionKey),
      refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken, encryptionKey) : null,
      expiresAt: tokens.expiresAt,
    });

    // Create refresh token
    const { token: refreshToken } = await createRefreshTokenFamily(
      tx,
      newUser.id,
      config.refreshToken.expiryDays,
    );

    return { user: newUser, refreshToken };
  });

  // Create access token
  const accessToken = createAccessToken(
    result.user.id,
    result.user.email,
    result.user.role,
    config.jwt.secret,
    config.jwt.accessTokenExpiry,
  );

  return {
    accessToken,
    refreshToken: result.refreshToken,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    },
    isNewUser: true,
  };
}

/**
 * Link OAuth account to existing user
 */
export async function linkOAuthAccount(
  db: DbClient,
  config: AuthConfig,
  userId: string,
  provider: OAuthProvider,
  userInfo: OAuthUserInfo,
  tokens: OAuthTokenResponse,
): Promise<void> {
  const encryptionKey = config.cookie.secret;

  // Check if user exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if this provider is already linked to this user
  const existingConnection = await db.query.oauthConnections.findFirst({
    where: and(eq(oauthConnections.userId, userId), eq(oauthConnections.provider, provider)),
  });

  if (existingConnection) {
    throw new ConflictError(
      `${provider} is already linked to your account`,
      'OAUTH_ALREADY_LINKED',
    );
  }

  // Check if this provider account is linked to another user
  const otherConnection = await db.query.oauthConnections.findFirst({
    where: and(
      eq(oauthConnections.provider, provider),
      eq(oauthConnections.providerUserId, userInfo.id),
    ),
  });

  if (otherConnection) {
    throw new ConflictError(
      `This ${provider} account is already linked to another user`,
      'OAUTH_LINKED_TO_OTHER',
    );
  }

  // Create OAuth connection
  await db.insert(oauthConnections).values({
    userId,
    provider,
    providerUserId: userInfo.id,
    providerEmail: userInfo.email,
    accessToken: encryptToken(tokens.accessToken, encryptionKey),
    refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken, encryptionKey) : null,
    expiresAt: tokens.expiresAt,
  });
}

/**
 * Unlink OAuth account from user
 */
export async function unlinkOAuthAccount(
  db: DbClient,
  userId: string,
  provider: OAuthProvider,
): Promise<void> {
  // Check if connection exists
  const connection = await db.query.oauthConnections.findFirst({
    where: and(eq(oauthConnections.userId, userId), eq(oauthConnections.provider, provider)),
  });

  if (!connection) {
    throw new NotFoundError(`${provider} is not linked to your account`);
  }

  // Check if this is the only auth method
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Count OAuth connections
  const connections = await db.query.oauthConnections.findMany({
    where: eq(oauthConnections.userId, userId),
  });

  // Check if user has a password (not just oauth:provider:hash)
  const hasPassword = !user.passwordHash.startsWith('oauth:');

  if (connections.length === 1 && !hasPassword) {
    throw new ConflictError(
      'Cannot unlink the only authentication method. Please set a password first or link another provider.',
      'CANNOT_UNLINK_ONLY_AUTH',
    );
  }

  // Delete the connection
  await db
    .delete(oauthConnections)
    .where(and(eq(oauthConnections.userId, userId), eq(oauthConnections.provider, provider)));
}

/**
 * Get user's connected OAuth providers
 */
export async function getConnectedProviders(
  db: DbClient,
  userId: string,
): Promise<OAuthConnectionInfo[]> {
  const connections = await db.query.oauthConnections.findMany({
    where: eq(oauthConnections.userId, userId),
  });

  return connections.map((conn) => ({
    id: conn.id,
    provider: conn.provider,
    providerEmail: conn.providerEmail,
    connectedAt: conn.createdAt,
  }));
}

/**
 * Find user by OAuth provider and provider user ID
 */
export async function findUserByOAuthProvider(
  db: DbClient,
  provider: OAuthProvider,
  providerUserId: string,
): Promise<{ userId: string; email: string } | null> {
  const connection = await db.query.oauthConnections.findFirst({
    where: and(
      eq(oauthConnections.provider, provider),
      eq(oauthConnections.providerUserId, providerUserId),
    ),
  });

  if (!connection) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, connection.userId),
  });

  if (!user) {
    return null;
  }

  return { userId: user.id, email: user.email };
}
