// src/server/core/src/auth/oauth/refresh.ts
/**
 * OAuth Token Refresh
 *
 * Proactively refreshes expiring OAuth access tokens using stored refresh tokens.
 * Designed to run as a periodic cron job to keep tokens fresh.
 *
 * @module oauth/refresh
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

import { MS_PER_HOUR } from '@abe-stack/shared';

import { getProviderClient } from './service';

import type { OAuthProviderClient } from './types';
import type { Repositories } from '@abe-stack/db';
import type { AuthConfig } from '@abe-stack/shared/config';

// ============================================================================
// Constants
// ============================================================================

/** Refresh tokens expiring within this window (in milliseconds) */
const REFRESH_WINDOW_MS = MS_PER_HOUR;

// ============================================================================
// Token Encryption (mirrors service.ts)
// ============================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Encrypt a token for storage.
 *
 * @param token - Plain text token
 * @param encryptionKey - Encryption key
 * @returns Encrypted token string
 * @complexity O(1)
 */
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
// Types
// ============================================================================

/** Logger interface for OAuth refresh operations */
interface RefreshLogger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

/** Result of an OAuth token refresh run */
export interface OAuthRefreshResult {
  /** Total connections checked */
  total: number;
  /** Successfully refreshed */
  refreshed: number;
  /** Failed to refresh */
  failed: number;
}

// ============================================================================
// Service
// ============================================================================

/**
 * Refresh expiring OAuth access tokens.
 *
 * Finds all OAuth connections with tokens expiring within the next hour
 * that have a stored refresh token, and attempts to refresh them.
 *
 * Failures are logged but do not propagate -- the cron should never crash.
 *
 * @param repos - Repository container
 * @param config - Auth configuration (for provider clients and encryption key)
 * @param log - Logger
 * @returns Summary of refresh operations
 * @complexity O(n) where n is the number of expiring connections
 */
export async function refreshExpiringOAuthTokens(
  repos: Repositories,
  config: AuthConfig,
  log: RefreshLogger,
): Promise<OAuthRefreshResult> {
  const threshold = new Date(Date.now() + REFRESH_WINDOW_MS);
  const encryptionKey = config.cookie.secret;

  const expiring = await repos.oauthConnections.findExpiringSoon(threshold);

  const result: OAuthRefreshResult = {
    total: expiring.length,
    refreshed: 0,
    failed: 0,
  };

  if (expiring.length === 0) {
    return result;
  }

  log.info({ count: expiring.length }, 'Found expiring OAuth tokens to refresh');

  for (const connection of expiring) {
    try {
      if (connection.refreshToken === null) {
        continue;
      }

      // Decrypt the stored refresh token
      let plainRefreshToken: string;
      try {
        plainRefreshToken = decryptToken(connection.refreshToken, encryptionKey);
      } catch {
        log.warn(
          { connectionId: connection.id, provider: connection.provider },
          'Failed to decrypt refresh token, skipping',
        );
        result.failed++;
        continue;
      }

      // Get the provider client to identify the provider
      let client: OAuthProviderClient;
      try {
        client = getProviderClient(connection.provider, config);
      } catch {
        log.warn(
          { connectionId: connection.id, provider: connection.provider },
          'OAuth provider not configured, skipping refresh',
        );
        result.failed++;
        continue;
      }

      // Exchange refresh token for new access token
      const tokens = await refreshProviderToken(client, plainRefreshToken, connection.provider);

      if (tokens === null) {
        log.warn(
          { connectionId: connection.id, provider: connection.provider },
          'Provider returned no tokens on refresh',
        );
        result.failed++;
        continue;
      }

      // Store the new tokens
      const updateData = {
        accessToken: encryptToken(tokens.accessToken, encryptionKey),
        expiresAt: tokens.expiresAt ?? null,
        updatedAt: new Date(),
        ...(tokens.refreshToken !== undefined
          ? { refreshToken: encryptToken(tokens.refreshToken, encryptionKey) }
          : {}),
      };

      await repos.oauthConnections.update(connection.id, updateData);

      result.refreshed++;
    } catch (error) {
      log.error(
        { err: error, connectionId: connection.id, provider: connection.provider },
        'Failed to refresh OAuth token',
      );
      result.failed++;
    }
  }

  log.info(
    { refreshed: result.refreshed, failed: result.failed, total: result.total },
    'OAuth token refresh complete',
  );

  return result;
}

// ============================================================================
// Provider Token Refresh
// ============================================================================

/** Token refresh result from provider */
interface RefreshedTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Refresh an access token using the provider's token endpoint.
 *
 * Each provider has slightly different refresh token endpoints,
 * but they all follow the OAuth 2.0 refresh_token grant flow.
 *
 * @param _client - Provider client (for provider identification)
 * @param refreshToken - The plain refresh token
 * @param provider - Provider name
 * @returns New tokens or null if refresh failed
 * @complexity O(1) - single HTTP request
 */
async function refreshProviderToken(
  _client: OAuthProviderClient,
  refreshToken: string,
  provider: string,
): Promise<RefreshedTokens | null> {
  // Provider-specific token endpoints for refresh
  const tokenEndpoints: Record<string, string> = {
    google: 'https://oauth2.googleapis.com/token',
    github: 'https://github.com/login/oauth/access_token',
  };

  const endpoint = tokenEndpoints[provider];
  if (endpoint === undefined) {
    // Apple doesn't support standard refresh token flow in the same way
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (data.access_token === undefined) {
      return null;
    }

    return {
      accessToken: data.access_token,
      ...(data.refresh_token !== undefined ? { refreshToken: data.refresh_token } : {}),
      ...(data.expires_in !== undefined
        ? { expiresAt: new Date(Date.now() + data.expires_in * 1000) }
        : {}),
    };
  } catch {
    return null;
  }
}
