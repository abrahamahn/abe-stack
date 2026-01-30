// apps/server/src/modules/auth/oauth/service.ts
/**
 * OAuth Service
 *
 * Business logic for OAuth authentication flows.
 * Handles provider management, account linking, and user creation.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

import {
    ConflictError,
    EmailAlreadyExistsError,
    NotFoundError,
    OAuthError,
    OAuthStateMismatchError,
} from '@abe-stack/core';
import {
    insert,
    OAUTH_CONNECTIONS_TABLE,
    toCamelCase,
    USER_COLUMNS,
    USERS_TABLE,
    type User,
} from '@abe-stack/db';

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
import type { AuthConfig, OAuthProviderConfig } from '@/config';

import { withTransaction, type DbClient, type OAuthProvider, type Repositories } from '@abe-stack/db';

import type { UserRole } from '@abe-stack/core';

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
    avatarUrl: string | null;
    role: UserRole;
    createdAt: string;
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

  if (saltB64 === undefined || ivB64 === undefined || tagB64 === undefined || encryptedB64 === undefined) {
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

  if (providerConfig == null) {
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

      if (appleConfig.teamId !== undefined && appleConfig.keyId !== undefined && appleConfig.privateKey !== undefined) {
        return createAppleProvider({
          clientId: appleConfig.clientId,
          teamId: appleConfig.teamId,
          keyId: appleConfig.keyId,
          privateKey: appleConfig.privateKey,
        });
      }
      throw new OAuthError(
        'Apple OAuth requires teamId, keyId, and privateKey configuration',
        'apple',
        'INCOMPLETE_CONFIG',
      );
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
  repos: Repositories,
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
    if (appleTokens.accessToken === '') {
      throw new OAuthError('Apple OAuth did not return id_token', 'apple', 'NO_ID_TOKEN');
    }
    // Get Apple client_id for id_token audience validation
    const appleConfig = config.oauth.apple;
    if (appleConfig == null) {
      throw new OAuthError('Apple OAuth not configured', 'apple', 'NOT_CONFIGURED');
    }
    // Verify signature and extract user info from id_token
    userInfo = await extractAppleUserFromIdToken(appleTokens.accessToken, appleConfig.clientId);
  } else {
    userInfo = await client.getUserInfo(tokens.accessToken);
  }

  // Handle linking vs authentication
  if (stateObj.isLinking && stateObj.userId !== undefined) {
    await linkOAuthAccount(db, repos, config, stateObj.userId, provider, userInfo, tokens);
    return { isLinking: true, linked: true };
  }

  // Authenticate or create user
  const auth = await authenticateOrCreateWithOAuth(db, repos, config, provider, userInfo, tokens);
  return { auth, isLinking: false };
}

/**
 * Authenticate existing user or create new user from OAuth
 */
async function authenticateOrCreateWithOAuth(
  db: DbClient,
  repos: Repositories,
  config: AuthConfig,
  provider: OAuthProvider,
  userInfo: OAuthUserInfo,
  tokens: OAuthTokenResponse,
): Promise<OAuthAuthResult> {
  const encryptionKey = config.cookie.secret;

  // Check if OAuth connection already exists (using repository)
  const existingConnection = await repos.oauthConnections.findByProviderUserId(
    provider,
    userInfo.id,
  );

  if (existingConnection != null) {
    // Update tokens and return existing user (using repository)
    await repos.oauthConnections.update(existingConnection.id, {
      accessToken: encryptToken(tokens.accessToken, encryptionKey),
      refreshToken: tokens.refreshToken !== undefined ? encryptToken(tokens.refreshToken, encryptionKey) : null,
      expiresAt: tokens.expiresAt ?? null,
      providerEmail: userInfo.email,
      updatedAt: new Date(),
    });

    const user = await repos.users.findById(existingConnection.userId);

    if (user == null) {
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
        avatarUrl: user.avatarUrl ?? null,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      isNewUser: false,
    };
  }

  // Check if email already exists (for a different user) - using repository
  const existingUser = await repos.users.findByEmail(userInfo.email);

  if (existingUser != null) {
    // Email exists but no OAuth connection - user should link their account
    throw new EmailAlreadyExistsError(
      `An account with email ${userInfo.email} already exists. Please log in and link your ${provider} account.`,
    );
  }

  // Create new user with OAuth connection
  const result = await withTransaction(db, async (tx) => {
    // Create user (verified if provider verified email)
    const newUserRows = await tx.query<Record<string, unknown>>(
      insert(USERS_TABLE)
        .values({
          email: userInfo.email,
          name: userInfo.name,
          // OAuth users don't have a password - generate a random unusable hash
          password_hash: `oauth:${provider}:${randomBytes(32).toString('hex')}`,
          role: 'user',
          email_verified: userInfo.emailVerified,
          email_verified_at: userInfo.emailVerified ? new Date() : null,
        })
        .returningAll()
        .toSql(),
    );

    if (newUserRows[0] == null) {
      throw new Error('Failed to create user');
    }

    const newUser = toCamelCase<User>(newUserRows[0], USER_COLUMNS);

    // Create OAuth connection
    await tx.execute(
      insert(OAUTH_CONNECTIONS_TABLE)
        .values({
          user_id: newUser.id,
          provider,
          provider_user_id: userInfo.id,
          provider_email: userInfo.email,
          access_token: encryptToken(tokens.accessToken, encryptionKey),
          refresh_token: tokens.refreshToken !== undefined
            ? encryptToken(tokens.refreshToken, encryptionKey)
            : null,
          expires_at: tokens.expiresAt,
        })
        .toSql(),
    );

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
      avatarUrl: result.user.avatarUrl ?? null,
      role: result.user.role,
      createdAt: result.user.createdAt.toISOString(),
    },
    isNewUser: true,
  };
}

/**
 * Link OAuth account to existing user
 *
 * Optimized: Runs validation queries in parallel instead of sequentially
 */
export async function linkOAuthAccount(
  _db: DbClient,
  repos: Repositories,
  config: AuthConfig,
  userId: string,
  provider: OAuthProvider,
  userInfo: OAuthUserInfo,
  tokens: OAuthTokenResponse,
): Promise<void> {
  const encryptionKey = config.cookie.secret;

  // Run all validation queries in parallel (no dependencies between them) - using repositories
  const [user, existingConnection, otherConnection] = await Promise.all([
    // Check if user exists
    repos.users.findById(userId),
    // Check if this provider is already linked to this user
    repos.oauthConnections.findByUserIdAndProvider(userId, provider),
    // Check if this provider account is linked to another user
    repos.oauthConnections.findByProviderUserId(provider, userInfo.id),
  ]);

  if (user == null) {
    throw new NotFoundError('User not found');
  }

  if (existingConnection != null) {
    throw new ConflictError(
      `${provider} is already linked to your account`,
      'OAUTH_ALREADY_LINKED',
    );
  }

  if (otherConnection != null) {
    throw new ConflictError(
      `This ${provider} account is already linked to another user`,
      'OAUTH_LINKED_TO_OTHER',
    );
  }

  // Create OAuth connection (using repository)
  await repos.oauthConnections.create({
    userId,
    provider,
    providerUserId: userInfo.id,
    providerEmail: userInfo.email,
    accessToken: encryptToken(tokens.accessToken, encryptionKey),
    refreshToken: tokens.refreshToken !== undefined ? encryptToken(tokens.refreshToken, encryptionKey) : null,
    expiresAt: tokens.expiresAt ?? null,
  });
}

/**
 * Unlink OAuth account from user
 *
 * Optimized: Runs validation queries in parallel instead of sequentially
 */
export async function unlinkOAuthAccount(
  _db: DbClient,
  repos: Repositories,
  userId: string,
  provider: OAuthProvider,
): Promise<void> {
  // Run all validation queries in parallel (no dependencies between them) - using repositories
  const [connection, user, connections] = await Promise.all([
    // Check if connection exists
    repos.oauthConnections.findByUserIdAndProvider(userId, provider),
    // Get user to check passwordHash
    repos.users.findById(userId),
    // Count OAuth connections for this user
    repos.oauthConnections.findByUserId(userId),
  ]);

  if (connection == null) {
    throw new NotFoundError(`${provider} is not linked to your account`);
  }

  if (user == null) {
    throw new NotFoundError('User not found');
  }

  // Check if user has a password (not just oauth:provider:hash)
  const hasPassword = !user.passwordHash.startsWith('oauth:');

  if (connections.length === 1 && !hasPassword) {
    throw new ConflictError(
      'Cannot unlink the only authentication method. Please set a password first or link another provider.',
      'CANNOT_UNLINK_ONLY_AUTH',
    );
  }

  // Delete the connection (using repository)
  await repos.oauthConnections.deleteByUserIdAndProvider(userId, provider);
}

/**
 * Get user's connected OAuth providers
 */
export async function getConnectedProviders(
  _db: DbClient,
  repos: Repositories,
  userId: string,
): Promise<OAuthConnectionInfo[]> {
  // Using repository
  const connections = await repos.oauthConnections.findByUserId(userId);

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
  _db: DbClient,
  repos: Repositories,
  provider: OAuthProvider,
  providerUserId: string,
): Promise<{ userId: string; email: string } | null> {
  // Using repositories (two queries instead of JOIN)
  const connection = await repos.oauthConnections.findByProviderUserId(provider, providerUserId);

  if (connection === null) {
    return null;
  }

  const user = await repos.users.findById(connection.userId);

  if (user === null) {
    return null;
  }

  return { userId: user.id, email: user.email };
}
