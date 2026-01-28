// apps/server/src/infrastructure/jobs/scheduled/oauthTokenRefresh.ts
/**
 * OAuth Token Refresh Job
 *
 * Scheduled job to proactively refresh OAuth access tokens before they expire.
 * This ensures users don't experience authentication failures due to expired tokens.
 *
 * Benefits:
 * - Seamless user experience (no unexpected auth failures)
 * - Reduced OAuth provider API calls (batch refresh vs on-demand)
 * - Better error handling (can retry in background)
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

import {
    and,
    eq,
    isNotNull,
    lt,
    OAUTH_CONNECTIONS_TABLE,
    select,
    selectCount,
    update,
    type OAuthProvider,
    type RawDb,
} from '@abe-stack/db';

// ============================================================================
// Constants
// ============================================================================

/** Default time before expiry to refresh tokens (in hours) */
export const DEFAULT_REFRESH_BEFORE_HOURS = 1;

/** Minimum refresh window (safety guard) */
export const MIN_REFRESH_BEFORE_HOURS = 0.5;

/** Maximum batch size for processing */
export const MAX_BATCH_SIZE = 100;

/** Token endpoint URLs for each provider */
const PROVIDER_TOKEN_URLS: Record<OAuthProvider, string> = {
  google: 'https://oauth2.googleapis.com/token',
  github: 'https://github.com/login/oauth/access_token',
  apple: 'https://appleid.apple.com/auth/token',
};

// ============================================================================
// Types
// ============================================================================

export interface OAuthTokenRefreshOptions {
  /** Hours before expiry to refresh tokens (default: 1) */
  refreshBeforeHours?: number;
  /** Maximum records to process in a single run (default: 100) */
  batchSize?: number;
  /** Whether to run in dry-run mode (count only, no refresh) */
  dryRun?: boolean;
  /** Encryption key for token decryption/encryption */
  encryptionKey: string;
  /** OAuth provider configurations */
  providerConfigs: Partial<Record<OAuthProvider, { clientId: string; clientSecret: string }>>;
}

export interface OAuthTokenRefreshResult {
  /** Number of tokens processed */
  processedCount: number;
  /** Number of tokens successfully refreshed */
  successCount: number;
  /** Number of tokens that failed to refresh */
  failureCount: number;
  /** Whether this was a dry run */
  dryRun: boolean;
  /** Duration of the operation in milliseconds */
  durationMs: number;
  /** Details of any failures */
  failures: Array<{
    connectionId: string;
    provider: OAuthProvider;
    error: string;
  }>;
}

interface ProviderTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

// ============================================================================
// Token Encryption (matches service.ts)
// ============================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

function encryptToken(token: string, encryptionKey: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(encryptionKey, salt, 32);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

function decryptToken(encryptedData: string, encryptionKey: string): string {
  const [saltB64, ivB64, tagB64, encryptedB64] = encryptedData.split(':');

  if ((saltB64 ?? '') === '' || (ivB64 ?? '') === '' || (tagB64 ?? '') === '' || (encryptedB64 ?? '') === '') {
    throw new Error('Invalid encrypted token format');
  }

  const salt = Buffer.from(saltB64 as string, 'base64');
  const iv = Buffer.from(ivB64 as string, 'base64');
  const tag = Buffer.from(tagB64 as string, 'base64');
  const encrypted = Buffer.from(encryptedB64 as string, 'base64');

  const key = scryptSync(encryptionKey, salt, 32);
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// ============================================================================
// Provider Token Refresh
// ============================================================================

/**
 * Refresh an access token using the provider's refresh token flow
 */
async function refreshProviderToken(
  provider: OAuthProvider,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<ProviderTokenResponse> {
  const tokenUrl = PROVIDER_TOKEN_URLS[provider];

  // Different providers have different request formats
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // GitHub requires Accept header for JSON response
  if (provider === 'github') {
    headers['Accept'] = 'application/json';
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${String(response.status)} - ${errorText}`);
  }

  const data = (await response.json()) as ProviderTokenResponse;

  if (data.access_token === '') {
    throw new Error('No access token in refresh response');
  }

  return data;
}

// ============================================================================
// Refresh Functions
// ============================================================================

/**
 * Refresh OAuth tokens that are about to expire
 *
 * Finds tokens expiring within the specified window and refreshes them
 * using each provider's refresh token flow.
 *
 * @param db - Database client
 * @param options - Refresh options including encryption key and provider configs
 * @returns Refresh result with success/failure counts
 *
 * @example
 * ```typescript
 * const result = await refreshExpiringOAuthTokens(db, {
 *   encryptionKey: config.auth.cookie.secret,
 *   providerConfigs: {
 *     google: { clientId: '...', clientSecret: '...' },
 *     github: { clientId: '...', clientSecret: '...' },
 *   },
 * });
 * console.log(`Refreshed ${result.successCount} tokens`);
 * ```
 */
export async function refreshExpiringOAuthTokens(
  db: RawDb,
  options: OAuthTokenRefreshOptions,
): Promise<OAuthTokenRefreshResult> {
  const startTime = Date.now();

  const {
    refreshBeforeHours = DEFAULT_REFRESH_BEFORE_HOURS,
    batchSize = MAX_BATCH_SIZE,
    dryRun = false,
    encryptionKey,
    providerConfigs,
  } = options;

  const effectiveRefreshHours = Math.max(refreshBeforeHours, MIN_REFRESH_BEFORE_HOURS);

  // Calculate cutoff - tokens expiring before this time need refresh
  const cutoffDate = new Date();
  cutoffDate.setTime(cutoffDate.getTime() + effectiveRefreshHours * 60 * 60 * 1000);

  // Find connections with expiring tokens that have refresh tokens
  type ConnectionRow = Record<string, unknown> & {
    id: string;
    provider: string;
    refresh_token: string | null;
    expires_at: Date | null;
  };
  const expiringConnections = await db.query<ConnectionRow>(
    select(OAUTH_CONNECTIONS_TABLE)
      .columns('id', 'provider', 'refresh_token', 'expires_at')
      .where(and(lt('expires_at', cutoffDate), isNotNull('refresh_token')))
      .limit(batchSize)
      .toSql(),
  );

  const result: OAuthTokenRefreshResult = {
    processedCount: expiringConnections.length,
    successCount: 0,
    failureCount: 0,
    dryRun,
    durationMs: 0,
    failures: [],
  };

  if (dryRun) {
    result.durationMs = Date.now() - startTime;
    return result;
  }

  // Process each expiring connection
  for (const connection of expiringConnections) {
    const provider = connection.provider as OAuthProvider;
    const providerConfig = providerConfigs[provider];

    if (providerConfig === undefined) {
      result.failureCount++;
      result.failures.push({
        connectionId: connection.id,
        provider,
        error: `No configuration found for provider: ${provider}`,
      });
      continue;
    }

    if (connection.refresh_token == null || connection.refresh_token === '') {
      result.failureCount++;
      result.failures.push({
        connectionId: connection.id,
        provider,
        error: 'No refresh token available',
      });
      continue;
    }

    try {
      // Decrypt the refresh token
      const decryptedRefreshToken = decryptToken(connection.refresh_token, encryptionKey);

      // Call provider to refresh
      const tokenResponse = await refreshProviderToken(
        provider,
        decryptedRefreshToken,
        providerConfig.clientId,
        providerConfig.clientSecret,
      );

      // Calculate new expiry
      const expiresAt = tokenResponse.expires_in != null
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : null;

      // Update the connection with new tokens
      await db.execute(
        update(OAUTH_CONNECTIONS_TABLE)
          .set({
            access_token: encryptToken(tokenResponse.access_token, encryptionKey),
            refresh_token: tokenResponse.refresh_token != null && tokenResponse.refresh_token !== ''
              ? encryptToken(tokenResponse.refresh_token, encryptionKey)
              : connection.refresh_token, // Keep old if not returned
            expires_at: expiresAt,
            updated_at: new Date(),
          })
          .where(eq('id', connection.id))
          .toSql(),
      );

      result.successCount++;
    } catch (error) {
      result.failureCount++;
      result.failures.push({
        connectionId: connection.id,
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

/**
 * Count OAuth tokens that will expire within the specified window
 * Useful for monitoring and alerting
 *
 * @param db - Database client
 * @param refreshBeforeHours - Hours before expiry (default: 1)
 * @returns Count of tokens expiring soon
 */
export async function countExpiringOAuthTokens(
  db: RawDb,
  refreshBeforeHours: number = DEFAULT_REFRESH_BEFORE_HOURS,
): Promise<number> {
  const effectiveRefreshHours = Math.max(refreshBeforeHours, MIN_REFRESH_BEFORE_HOURS);

  const cutoffDate = new Date();
  cutoffDate.setTime(cutoffDate.getTime() + effectiveRefreshHours * 60 * 60 * 1000);

  const result = await db.queryOne<{ count: number }>(
    selectCount(OAUTH_CONNECTIONS_TABLE)
      .where(and(lt('expires_at', cutoffDate), isNotNull('refresh_token')))
      .toSql(),
  );

  return result?.count ?? 0;
}

/**
 * Get statistics about OAuth token expiration
 * Useful for monitoring and reporting
 *
 * @param db - Database client
 * @param refreshBeforeHours - Hours before expiry to consider (default: 1)
 */
export async function getOAuthTokenStats(
  db: RawDb,
  refreshBeforeHours: number = DEFAULT_REFRESH_BEFORE_HOURS,
): Promise<{
  total: number;
  expiringSoon: number;
  expired: number;
  withRefreshToken: number;
  refreshBeforeHours: number;
}> {
  const effectiveRefreshHours = Math.max(refreshBeforeHours, MIN_REFRESH_BEFORE_HOURS);
  const now = new Date();

  const cutoffDate = new Date();
  cutoffDate.setTime(cutoffDate.getTime() + effectiveRefreshHours * 60 * 60 * 1000);

  const [totalResult, expiringSoonResult, expiredResult, withRefreshResult] = await Promise.all([
    db.queryOne<{ count: number }>(selectCount(OAUTH_CONNECTIONS_TABLE).toSql()),
    db.queryOne<{ count: number }>(
      selectCount(OAUTH_CONNECTIONS_TABLE)
        .where(and(lt('expires_at', cutoffDate), isNotNull('expires_at')))
        .toSql(),
    ),
    db.queryOne<{ count: number }>(
      selectCount(OAUTH_CONNECTIONS_TABLE).where(lt('expires_at', now)).toSql(),
    ),
    db.queryOne<{ count: number }>(
      selectCount(OAUTH_CONNECTIONS_TABLE).where(isNotNull('refresh_token')).toSql(),
    ),
  ]);

  return {
    total: totalResult?.count ?? 0,
    expiringSoon: expiringSoonResult?.count ?? 0,
    expired: expiredResult?.count ?? 0,
    withRefreshToken: withRefreshResult?.count ?? 0,
    refreshBeforeHours: effectiveRefreshHours,
  };
}
