// src/server/core/src/auth/oauth/service.ts
/**
 * OAuth Service
 *
 * Business logic for OAuth authentication flows.
 * Handles provider management, account linking, and user creation.
 *
 * @module oauth/service
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

import {
  insert,
  OAUTH_CONNECTIONS_TABLE,
  toCamelCase,
  USER_COLUMNS,
  USERS_TABLE,
  withTransaction,
  type DbClient,
  type OAuthProvider,
  type Repositories,
  type User,
  type UserRole,
} from '@abe-stack/db';
import {
  canonicalizeEmail,
  ConflictError,
  EmailAlreadyExistsError,
  NotFoundError,
  normalizeEmail,
  OAuthError,
  OAuthStateMismatchError,
  type UserId,
} from '@abe-stack/shared';

import {
  createAccessToken,
  createRefreshTokenFamily,
  generateUniqueUsername,
  splitFullName,
} from '../utils';

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
import type { AuthConfig, OAuthProviderConfig } from '@abe-stack/shared/config';

// ============================================================================
// Types
// ============================================================================

/**
 * OAuth authentication result.
 */
export interface OAuthAuthResult {
  /** JWT access token */
  accessToken: string;
  /** Opaque refresh token */
  refreshToken: string;
  /** Authenticated user data (matches domain User from @abe-stack/shared) */
  user: {
    id: UserId;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: UserRole;
    emailVerified: boolean;
    phone: string | null;
    phoneVerified: boolean | null;
    dateOfBirth: string | null;
    gender: string | null;
    createdAt: string;
    updatedAt: string;
  };
  /** Whether this is a newly created user */
  isNewUser: boolean;
}

/**
 * OAuth callback result.
 */
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
 * Encrypt a token for storage.
 *
 * @param token - Plain text token
 * @param encryptionKey - Encryption key
 * @returns Encrypted token string (salt:iv:tag:encrypted, all base64)
 * @complexity O(1)
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
 * Decrypt a stored token.
 *
 * @param encryptedData - Encrypted token string
 * @param encryptionKey - Encryption key
 * @returns Decrypted token
 * @throws Error if format is invalid or decryption fails
 * @complexity O(1)
 */
function decryptToken(encryptedData: string, encryptionKey: string): string {
  const [saltB64, ivB64, tagB64, encryptedB64] = encryptedData.split(':');

  if (
    saltB64 === undefined ||
    ivB64 === undefined ||
    tagB64 === undefined ||
    encryptedB64 === undefined
  ) {
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
 * Create OAuth state for CSRF protection.
 *
 * @param provider - OAuth provider
 * @param redirectUri - Callback URL
 * @param isLinking - Whether this is a link operation
 * @param userId - User ID if linking
 * @returns OAuth state object
 * @complexity O(1)
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
 * Encode OAuth state for URL parameter.
 *
 * @param state - OAuth state object
 * @param encryptionKey - Encryption key for state
 * @returns Encrypted state string
 * @complexity O(1)
 */
export function encodeOAuthState(state: OAuthState, encryptionKey: string): string {
  const json = JSON.stringify(state);
  return encryptToken(json, encryptionKey);
}

/**
 * Decode and validate OAuth state.
 *
 * @param encoded - Encrypted state string
 * @param encryptionKey - Encryption key for state
 * @returns Decoded OAuth state
 * @throws {OAuthStateMismatchError} If state is invalid or expired
 * @complexity O(1)
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
 * Get OAuth provider client for the given provider.
 *
 * @param provider - OAuth provider name
 * @param config - Auth configuration
 * @returns OAuth provider client
 * @throws {OAuthError} If provider is not configured or unsupported
 * @complexity O(1)
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

      if (
        appleConfig.teamId !== undefined &&
        appleConfig.keyId !== undefined &&
        appleConfig.privateKey !== undefined
      ) {
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
 * Generate authorization URL for OAuth flow.
 *
 * @param provider - OAuth provider
 * @param config - Auth configuration
 * @param redirectUri - Callback URL
 * @param isLinking - Whether this is a link operation
 * @param userId - User ID if linking
 * @returns URL and encoded state
 * @complexity O(1)
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
 * Handle OAuth callback - exchange code for tokens and authenticate/link user.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param provider - OAuth provider
 * @param code - Authorization code
 * @param state - Encrypted OAuth state
 * @param redirectUri - Callback URL
 * @returns Callback result
 * @throws {OAuthStateMismatchError} If state validation fails
 * @complexity O(1) - constant database operations
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
 * Authenticate existing user or create new user from OAuth.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param provider - OAuth provider
 * @param userInfo - User info from provider
 * @param tokens - Token response from provider
 * @returns Authentication result
 * @complexity O(1) - constant database operations
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
  const normalizedEmail = normalizeEmail(userInfo.email);
  const canonicalEmail = canonicalizeEmail(userInfo.email);

  // Check if OAuth connection already exists (using repository)
  const existingConnection = await repos.oauthConnections.findByProviderUserId(
    provider,
    userInfo.id,
  );

  if (existingConnection != null) {
    // Update tokens and return existing user (using repository)
    await repos.oauthConnections.update(existingConnection.id, {
      accessToken: encryptToken(tokens.accessToken, encryptionKey),
      refreshToken:
        tokens.refreshToken !== undefined ? encryptToken(tokens.refreshToken, encryptionKey) : null,
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
        id: user.id as UserId,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role,
        emailVerified: user.emailVerified,
        phone: user.phone ?? null,
        phoneVerified: user.phoneVerified ?? null,
        dateOfBirth: user.dateOfBirth !== null ? user.dateOfBirth.toISOString().slice(0, 10) : null,
        gender: user.gender ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      isNewUser: false,
    };
  }

  // Check if email already exists (for a different user) - using repository
  const existingUser = await repos.users.findByEmail(canonicalEmail);

  if (existingUser != null) {
    // Email exists but no OAuth connection - user should link their account
    throw new EmailAlreadyExistsError(
      `An account with email ${userInfo.email} already exists. Please log in and link your ${provider} account.`,
    );
  }

  // Generate username and split name for new OAuth user
  const username = await generateUniqueUsername(repos, userInfo.email);
  const { firstName, lastName } = splitFullName(userInfo.name);

  // Create new user with OAuth connection
  const result = await withTransaction(db, async (tx) => {
    // Create user (verified if provider verified email)
    const newUserRows = await tx.query(
      insert(USERS_TABLE)
        .values({
          email: normalizedEmail,
          canonical_email: canonicalEmail,
          username,
          first_name: firstName,
          last_name: lastName,
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
          refresh_token:
            tokens.refreshToken !== undefined
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
      id: result.user.id as UserId,
      email: result.user.email,
      username: result.user.username,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      avatarUrl: result.user.avatarUrl ?? null,
      role: result.user.role,
      emailVerified: result.user.emailVerified,
      phone: result.user.phone ?? null,
      phoneVerified: result.user.phoneVerified ?? null,
      dateOfBirth:
        result.user.dateOfBirth !== null
          ? result.user.dateOfBirth.toISOString().slice(0, 10)
          : null,
      gender: result.user.gender ?? null,
      createdAt: result.user.createdAt.toISOString(),
      updatedAt: result.user.updatedAt.toISOString(),
    },
    isNewUser: true,
  };
}

/**
 * Link OAuth account to existing user.
 * Runs validation queries in parallel for performance.
 *
 * @param _db - Database client (unused)
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param userId - User ID to link to
 * @param provider - OAuth provider
 * @param userInfo - User info from provider
 * @param tokens - Token response from provider
 * @throws {NotFoundError} If user not found
 * @throws {ConflictError} If provider already linked
 * @complexity O(1) - parallel validation queries
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
    refreshToken:
      tokens.refreshToken !== undefined ? encryptToken(tokens.refreshToken, encryptionKey) : null,
    expiresAt: tokens.expiresAt ?? null,
  });
}

/**
 * Unlink OAuth account from user.
 * Runs validation queries in parallel for performance.
 *
 * @param _db - Database client (unused)
 * @param repos - Repositories
 * @param userId - User ID
 * @param provider - OAuth provider to unlink
 * @throws {NotFoundError} If connection or user not found
 * @throws {ConflictError} If this is the only auth method
 * @complexity O(1) - parallel validation queries
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
  const userHasPassword = !user.passwordHash.startsWith('oauth:');

  if (connections.length === 1 && !userHasPassword) {
    throw new ConflictError(
      'Cannot unlink the only authentication method. Please set a password first or link another provider.',
      'CANNOT_UNLINK_ONLY_AUTH',
    );
  }

  // Delete the connection (using repository)
  await repos.oauthConnections.deleteByUserIdAndProvider(userId, provider);
}

/**
 * Get user's connected OAuth providers.
 *
 * @param _db - Database client (unused)
 * @param repos - Repositories
 * @param userId - User ID
 * @returns Array of OAuth connection info
 * @complexity O(n) where n is the number of connections
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
 * Find user by OAuth provider and provider user ID.
 *
 * @param _db - Database client (unused)
 * @param repos - Repositories
 * @param provider - OAuth provider
 * @param providerUserId - Provider-specific user ID
 * @returns User info or null
 * @complexity O(1)
 */
export async function findUserByOAuthProvider(
  _db: DbClient,
  repos: Repositories,
  provider: OAuthProvider,
  providerUserId: string,
): Promise<{ userId: string; email: string; canonicalEmail: string } | null> {
  // Using repositories (two queries instead of JOIN)
  const connection = await repos.oauthConnections.findByProviderUserId(provider, providerUserId);

  if (connection === null) {
    return null;
  }

  const user = await repos.users.findById(connection.userId);

  if (user === null) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    canonicalEmail: user.canonicalEmail,
  };
}
