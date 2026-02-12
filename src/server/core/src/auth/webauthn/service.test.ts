// src/server/core/src/auth/webauthn/service.test.ts
/**
 * WebAuthn Service Tests
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  clearChallengeStore,
  getAuthenticationOptions,
  getRegistrationOptions,
  verifyAuthentication,
  verifyRegistration,
} from './service';

import type { Repositories } from '@abe-stack/db';
import type { AuthConfig } from '@abe-stack/shared/config';

// ============================================================================
// Mock @simplewebauthn/server
// ============================================================================

const {
  mockGenerateRegistrationOptions,
  mockVerifyRegistrationResponse,
  mockGenerateAuthenticationOptions,
  mockVerifyAuthenticationResponse,
} = vi.hoisted(() => ({
  mockGenerateRegistrationOptions: vi.fn(),
  mockVerifyRegistrationResponse: vi.fn(),
  mockGenerateAuthenticationOptions: vi.fn(),
  mockVerifyAuthenticationResponse: vi.fn(),
}));

vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: mockGenerateRegistrationOptions,
  verifyRegistrationResponse: mockVerifyRegistrationResponse,
  generateAuthenticationOptions: mockGenerateAuthenticationOptions,
  verifyAuthenticationResponse: mockVerifyAuthenticationResponse,
}));

// ============================================================================
// Test Helpers
// ============================================================================

const testAuthConfig: AuthConfig = {
  jwt: { secret: 'test-secret-32-chars-long!!!', accessTokenExpiry: '15m' },
  argon2: {},
  refreshToken: { expiryDays: 7, gracePeriodSeconds: 30 },
  lockout: { maxAttempts: 5, windowMs: 900000, lockoutDurationMs: 1800000 },
  webauthn: {
    rpName: 'Test App',
    rpId: 'localhost',
    origin: 'http://localhost:3000',
  },
} as unknown as AuthConfig;

const noWebauthnConfig: AuthConfig = {
  jwt: { secret: 'test-secret', accessTokenExpiry: '15m' },
  argon2: {},
  refreshToken: { expiryDays: 7, gracePeriodSeconds: 30 },
  lockout: { maxAttempts: 5, windowMs: 900000, lockoutDurationMs: 1800000 },
} as unknown as AuthConfig;

function createMockRepos(overrides?: Record<string, unknown>): Repositories {
  return {
    webauthnCredentials: {
      findByUserId: vi.fn().mockResolvedValue([]),
      findByCredentialId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'cred-new', credentialId: 'abc123' }),
      updateCounter: vi.fn().mockResolvedValue(undefined),
      updateName: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteAllByUserId: vi.fn().mockResolvedValue(0),
    },
    users: {
      findByEmail: vi.fn().mockResolvedValue(null),
    },
    ...overrides,
  } as unknown as Repositories;
}

// Access webauthnCredentials through a cast since it may not be in the compiled Repositories type yet
function getCredRepo(repos: Repositories): {
  findByUserId: ReturnType<typeof vi.fn>;
  findByCredentialId: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  updateCounter: ReturnType<typeof vi.fn>;
} {
  return (repos as unknown as Record<string, unknown>)['webauthnCredentials'] as ReturnType<
    typeof getCredRepo
  >;
}

// ============================================================================
// Tests
// ============================================================================

describe('WebAuthn Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearChallengeStore();
  });

  afterEach(() => {
    clearChallengeStore();
  });

  // --------------------------------------------------------------------------
  // getRegistrationOptions
  // --------------------------------------------------------------------------
  describe('getRegistrationOptions', () => {
    test('generates options and stores challenge', async () => {
      const mockOptions = { challenge: 'test-challenge-123', rp: { name: 'Test' } };
      mockGenerateRegistrationOptions.mockResolvedValue(mockOptions);

      const repos = createMockRepos();
      const result = await getRegistrationOptions(repos, 'user-1', 'user@test.com', testAuthConfig);

      expect(result).toEqual(mockOptions);
      expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          rpName: 'Test App',
          rpID: 'localhost',
          userName: 'user@test.com',
          attestationType: 'none',
        }),
      );
    });

    test('excludes existing credentials', async () => {
      mockGenerateRegistrationOptions.mockResolvedValue({ challenge: 'c' });
      const repos = createMockRepos({
        webauthnCredentials: {
          findByUserId: vi
            .fn()
            .mockResolvedValue([{ credentialId: 'existing-1', transports: 'internal,hybrid' }]),
          findByCredentialId: vi.fn(),
          create: vi.fn(),
          updateCounter: vi.fn(),
          updateName: vi.fn(),
          delete: vi.fn(),
          deleteAllByUserId: vi.fn(),
        },
      });

      await getRegistrationOptions(repos, 'user-1', 'user@test.com', testAuthConfig);

      expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeCredentials: [{ id: 'existing-1', transports: ['internal', 'hybrid'] }],
        }),
      );
    });

    test('throws when webauthn is not configured', async () => {
      const repos = createMockRepos();
      await expect(
        getRegistrationOptions(repos, 'user-1', 'user@test.com', noWebauthnConfig),
      ).rejects.toThrow('WebAuthn is not configured');
    });
  });

  // --------------------------------------------------------------------------
  // verifyRegistration
  // --------------------------------------------------------------------------
  describe('verifyRegistration', () => {
    test('verifies and stores credential', async () => {
      // First generate options to store the challenge
      mockGenerateRegistrationOptions.mockResolvedValue({ challenge: 'reg-challenge' });
      const repos = createMockRepos();
      await getRegistrationOptions(repos, 'user-1', 'user@test.com', testAuthConfig);

      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'new-cred-id',
            publicKey: new Uint8Array([1, 2, 3]),
            counter: 0,
          },
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: true,
        },
      });

      const result = await verifyRegistration(
        repos,
        'user-1',
        { id: 'new-cred-id', response: { transports: ['internal'] } },
        testAuthConfig,
        'My Key',
      );

      expect(result.message).toBe('Passkey registered successfully');
      expect(getCredRepo(repos).create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          credentialId: 'new-cred-id',
          name: 'My Key',
          deviceType: 'multiDevice',
          backedUp: true,
        }),
      );
    });

    test('throws when challenge is missing/expired', async () => {
      const repos = createMockRepos();
      await expect(verifyRegistration(repos, 'user-1', {}, testAuthConfig)).rejects.toThrow(
        'Registration challenge expired or not found',
      );
    });

    test('throws when verification fails', async () => {
      mockGenerateRegistrationOptions.mockResolvedValue({ challenge: 'c2' });
      const repos = createMockRepos();
      await getRegistrationOptions(repos, 'user-1', 'user@test.com', testAuthConfig);

      mockVerifyRegistrationResponse.mockResolvedValue({ verified: false });

      await expect(verifyRegistration(repos, 'user-1', {}, testAuthConfig)).rejects.toThrow(
        'WebAuthn registration verification failed',
      );
    });

    test('defaults name to Passkey when not provided', async () => {
      mockGenerateRegistrationOptions.mockResolvedValue({ challenge: 'c3' });
      const repos = createMockRepos();
      await getRegistrationOptions(repos, 'user-1', 'u@t.com', testAuthConfig);

      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: { id: 'id', publicKey: new Uint8Array([4]), counter: 0 },
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      });

      await verifyRegistration(repos, 'user-1', { response: {} }, testAuthConfig);

      expect(getCredRepo(repos).create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Passkey' }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // getAuthenticationOptions
  // --------------------------------------------------------------------------
  describe('getAuthenticationOptions', () => {
    test('generates options without email filter', async () => {
      mockGenerateAuthenticationOptions.mockResolvedValue({ challenge: 'auth-c' });

      const repos = createMockRepos();
      const result = await getAuthenticationOptions(repos, testAuthConfig);

      expect(result.options).toBeDefined();
      expect(result.sessionKey).toMatch(/^auth:/);
      expect(mockGenerateAuthenticationOptions).toHaveBeenCalledWith(
        expect.objectContaining({ rpID: 'localhost', userVerification: 'preferred' }),
      );
    });

    test('narrows to user credentials when email provided', async () => {
      mockGenerateAuthenticationOptions.mockResolvedValue({ challenge: 'auth-c2' });

      const repos = createMockRepos({
        users: { findByEmail: vi.fn().mockResolvedValue({ id: 'user-42' }) },
        webauthnCredentials: {
          findByUserId: vi.fn().mockResolvedValue([{ credentialId: 'cred-a', transports: 'usb' }]),
          findByCredentialId: vi.fn(),
          create: vi.fn(),
          updateCounter: vi.fn(),
          updateName: vi.fn(),
          delete: vi.fn(),
          deleteAllByUserId: vi.fn(),
        },
      });

      await getAuthenticationOptions(repos, testAuthConfig, 'user@test.com');

      expect(repos.users.findByEmail).toHaveBeenCalledWith('user@test.com');
      expect(mockGenerateAuthenticationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          allowCredentials: [{ id: 'cred-a', transports: ['usb'] }],
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // verifyAuthentication
  // --------------------------------------------------------------------------
  describe('verifyAuthentication', () => {
    test('verifies assertion and updates counter', async () => {
      // First get options to store challenge
      mockGenerateAuthenticationOptions.mockResolvedValue({ challenge: 'auth-verify' });
      const repos = createMockRepos();
      const { sessionKey } = await getAuthenticationOptions(repos, testAuthConfig);

      // Set up credential lookup
      getCredRepo(repos).findByCredentialId.mockResolvedValue({
        id: 'db-id-1',
        userId: 'user-99',
        credentialId: 'cred-xyz',
        publicKey: Buffer.from([1, 2]).toString('base64url'),
        counter: 5,
        transports: null,
        deviceType: 'multiDevice',
        backedUp: true,
        name: 'Key',
        createdAt: new Date(),
        lastUsedAt: null,
      });

      mockVerifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 6 },
      });

      const result = await verifyAuthentication(
        repos,
        { id: 'cred-xyz' },
        sessionKey,
        testAuthConfig,
      );

      expect(result.userId).toBe('user-99');
      expect(getCredRepo(repos).updateCounter).toHaveBeenCalledWith('db-id-1', 6);
    });

    test('throws when challenge is missing', async () => {
      const repos = createMockRepos();
      await expect(
        verifyAuthentication(repos, { id: 'x' }, 'bad-key', testAuthConfig),
      ).rejects.toThrow('Authentication challenge expired or not found');
    });

    test('throws when credential not in database', async () => {
      mockGenerateAuthenticationOptions.mockResolvedValue({ challenge: 'c-miss' });
      const repos = createMockRepos();
      const { sessionKey } = await getAuthenticationOptions(repos, testAuthConfig);

      getCredRepo(repos).findByCredentialId.mockResolvedValue(null);

      await expect(
        verifyAuthentication(repos, { id: 'unknown' }, sessionKey, testAuthConfig),
      ).rejects.toThrow('Credential not found');
    });

    test('throws when assertion verification fails', async () => {
      mockGenerateAuthenticationOptions.mockResolvedValue({ challenge: 'c-fail' });
      const repos = createMockRepos();
      const { sessionKey } = await getAuthenticationOptions(repos, testAuthConfig);

      getCredRepo(repos).findByCredentialId.mockResolvedValue({
        id: 'db-1',
        userId: 'u-1',
        credentialId: 'cid',
        publicKey: Buffer.from([1]).toString('base64url'),
        counter: 0,
        transports: null,
        deviceType: null,
        backedUp: false,
        name: 'Key',
        createdAt: new Date(),
        lastUsedAt: null,
      });

      mockVerifyAuthenticationResponse.mockResolvedValue({ verified: false });

      await expect(
        verifyAuthentication(repos, { id: 'cid' }, sessionKey, testAuthConfig),
      ).rejects.toThrow('WebAuthn authentication verification failed');
    });
  });

  // --------------------------------------------------------------------------
  // Challenge store
  // --------------------------------------------------------------------------
  describe('clearChallengeStore', () => {
    test('clears all stored challenges', async () => {
      mockGenerateRegistrationOptions.mockResolvedValue({ challenge: 'to-clear' });
      const repos = createMockRepos();
      await getRegistrationOptions(repos, 'u1', 'e@t.com', testAuthConfig);

      clearChallengeStore();

      // Now verification should fail since challenge was cleared
      await expect(verifyRegistration(repos, 'u1', {}, testAuthConfig)).rejects.toThrow(
        'Registration challenge expired or not found',
      );
    });
  });
});
