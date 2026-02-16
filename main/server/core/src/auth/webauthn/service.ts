// main/server/core/src/auth/webauthn/service.ts
/**
 * WebAuthn Service
 *
 * Business logic for WebAuthn/Passkey registration and authentication.
 * Uses @simplewebauthn/server for attestation/assertion verification.
 *
 * @module webauthn/service
 */

import { MS_PER_MINUTE } from '@abe-stack/shared';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

import type { Repositories } from '../../../../db/src';
import type { AuthConfig } from '@abe-stack/shared/config';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';

// ============================================================================
// Constants
// ============================================================================

const CHALLENGE_TTL_MS = 5 * MS_PER_MINUTE;
const CHALLENGE_CLEANUP_INTERVAL_MS = MS_PER_MINUTE;

// ============================================================================
// Challenge Store (In-Memory with TTL)
// ============================================================================

interface ChallengeEntry {
  challenge: string;
  expiresAt: number;
}

const challengeStore = new Map<string, ChallengeEntry>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer !== null) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of challengeStore) {
      if (entry.expiresAt < now) challengeStore.delete(key);
    }
  }, CHALLENGE_CLEANUP_INTERVAL_MS);
  // Allow process to exit even if timer is running
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

function storeChallenge(key: string, challenge: string): void {
  startCleanup();
  challengeStore.set(key, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS });
}

function consumeChallenge(key: string): string | null {
  const entry = challengeStore.get(key);
  if (entry === undefined) return null;
  challengeStore.delete(key);
  if (entry.expiresAt < Date.now()) return null;
  return entry.challenge;
}

/** Visible for testing */
export function clearChallengeStore(): void {
  challengeStore.clear();
  if (cleanupTimer !== null) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// ============================================================================
// WebAuthn Config Helpers
// ============================================================================

interface WebauthnConfig {
  rpName: string;
  rpId: string;
  origin: string;
  attestation: 'none' | 'direct';
}

function getWebauthnConfig(authConfig: AuthConfig): WebauthnConfig {
  const wc = authConfig.webauthn;
  if (wc === undefined) {
    throw new Error('WebAuthn is not configured. Set auth.webauthn in config.');
  }
  return {
    rpName: wc.rpName,
    rpId: wc.rpId,
    origin: wc.origin,
    attestation: wc.attestation === 'direct' ? 'direct' : 'none',
  };
}

// ============================================================================
// Helpers
// ============================================================================

function parseTransports(transports: string | null): AuthenticatorTransportFuture[] | undefined {
  if (transports === null || transports === '') return undefined;
  return transports.split(',') as AuthenticatorTransportFuture[];
}

// ============================================================================
// Registration
// ============================================================================

/**
 * Generate registration options for a user.
 * Excludes any credentials the user already has registered.
 */
export async function getRegistrationOptions(
  repos: Repositories,
  userId: string,
  userEmail: string,
  authConfig: AuthConfig,
): Promise<Record<string, unknown>> {
  const config = getWebauthnConfig(authConfig);
  const existing = await repos.webauthnCredentials.findByUserId(userId);

  const excludeCredentials = existing.map((cred) => {
    const transports = parseTransports(cred.transports);
    return transports !== undefined
      ? { id: cred.credentialId, transports }
      : { id: cred.credentialId };
  });

  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userName: userEmail,
    attestationType: config.attestation,
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Store challenge keyed by userId
  storeChallenge(`reg:${userId}`, options.challenge);

  return options as unknown as Record<string, unknown>;
}

/**
 * Verify a registration response and store the credential.
 */
export async function verifyRegistration(
  repos: Repositories,
  userId: string,
  credential: Record<string, unknown>,
  authConfig: AuthConfig,
  credentialName?: string,
): Promise<{ credentialId: string; message: string }> {
  const config = getWebauthnConfig(authConfig);
  const expectedChallenge = consumeChallenge(`reg:${userId}`);
  if (expectedChallenge === null) {
    throw new Error('Registration challenge expired or not found');
  }

  const verification = await verifyRegistrationResponse({
    response: credential as unknown as Parameters<typeof verifyRegistrationResponse>[0]['response'],
    expectedChallenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
  });

  if (!verification.verified) {
    throw new Error('WebAuthn registration verification failed');
  }

  const {
    credential: regCredential,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo;

  // Extract transports from the credential response
  const responseObj = credential['response'] as Record<string, unknown> | undefined;
  const transportsArray =
    responseObj !== undefined && Array.isArray(responseObj['transports'])
      ? (responseObj['transports'] as string[]).join(',')
      : null;

  // Store credential
  const stored = await repos.webauthnCredentials.create({
    userId,
    credentialId: regCredential.id,
    publicKey: Buffer.from(regCredential.publicKey).toString('base64url'),
    counter: regCredential.counter,
    transports: transportsArray,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    name: credentialName ?? 'Passkey',
  });

  return { credentialId: stored.id, message: 'Passkey registered successfully' };
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Generate authentication options.
 * If email is provided, only allows credentials for that user.
 */
export async function getAuthenticationOptions(
  repos: Repositories,
  authConfig: AuthConfig,
  email?: string,
): Promise<{ options: Record<string, unknown>; sessionKey: string }> {
  const config = getWebauthnConfig(authConfig);

  const allowCredentials: Array<{
    id: string;
    transports?: AuthenticatorTransportFuture[];
  }> = [];

  if (email !== undefined) {
    // Find user by email, then their credentials
    const user = await repos.users.findByEmail(email);
    if (user !== null) {
      const creds = await repos.webauthnCredentials.findByUserId(user.id);
      for (const c of creds) {
        const transports = parseTransports(c.transports);
        allowCredentials.push(
          transports !== undefined ? { id: c.credentialId, transports } : { id: c.credentialId },
        );
      }
    }
  }

  const authOptions =
    allowCredentials.length > 0
      ? { rpID: config.rpId, allowCredentials, userVerification: 'preferred' as const }
      : { rpID: config.rpId, userVerification: 'preferred' as const };

  const options = await generateAuthenticationOptions(authOptions);

  // Use a random session key for challenge storage (no user session yet)
  const sessionKey = `auth:${crypto.randomUUID()}`;
  storeChallenge(sessionKey, options.challenge);

  return {
    options: { ...(options as unknown as Record<string, unknown>), sessionKey },
    sessionKey,
  };
}

/**
 * Verify an authentication response.
 * Returns the authenticated user ID on success.
 */
export async function verifyAuthentication(
  repos: Repositories,
  credential: Record<string, unknown>,
  sessionKey: string,
  authConfig: AuthConfig,
): Promise<{ userId: string }> {
  const config = getWebauthnConfig(authConfig);
  const expectedChallenge = consumeChallenge(sessionKey);
  if (expectedChallenge === null) {
    throw new Error('Authentication challenge expired or not found');
  }

  // Find the credential in the database
  const credentialId = credential['id'] as string;
  const storedCred = await repos.webauthnCredentials.findByCredentialId(credentialId);
  if (storedCred === null) {
    throw new Error('Credential not found');
  }

  const storedTransports = parseTransports(storedCred.transports);

  const verification = await verifyAuthenticationResponse({
    response: credential as unknown as Parameters<
      typeof verifyAuthenticationResponse
    >[0]['response'],
    expectedChallenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
    credential: {
      id: storedCred.credentialId,
      publicKey: new Uint8Array(Buffer.from(storedCred.publicKey, 'base64url')),
      counter: storedCred.counter,
      ...(storedTransports !== undefined ? { transports: storedTransports } : {}),
    },
  });

  if (!verification.verified) {
    throw new Error('WebAuthn authentication verification failed');
  }

  // Update counter
  await repos.webauthnCredentials.updateCounter(
    storedCred.id,
    verification.authenticationInfo.newCounter,
  );

  return { userId: storedCred.userId };
}
