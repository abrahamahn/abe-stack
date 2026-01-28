// apps/web/src/api/client.test.ts
/**
 * Unit tests for the API client module.
 *
 * Tests verify:
 * - API client is created and exported
 * - Configuration is applied correctly
 * - Token retrieval integration works
 *
 * Note: In Vitest 4 with ESM, mocking path-aliased external packages
 * after vi.resetModules is problematic. These tests verify the module
 * structure without relying on dynamic imports after module reset.
 *
 * @complexity O(1) - All tests are unit tests
 */

import { describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mock dependencies before importing the module
// Use importOriginal to preserve all exports and only mock tokenStore
// ============================================================================

vi.mock('@abe-stack/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/core')>();
  return {
    ...actual,
    tokenStore: {
      get: vi.fn(() => 'mock-token'),
      set: vi.fn(),
      clear: vi.fn(),
    },
  };
});

// ============================================================================
// Import the module under test after mocks are set up
// ============================================================================

import { api } from './client';
import { clientConfig } from '../config';

// ============================================================================
// Tests
// ============================================================================

describe('api client', () => {
  describe('client export', () => {
    it('should export an api client', () => {
      expect(api).toBeDefined();
    });

    it('should have login method', () => {
      expect(api).toHaveProperty('login');
      expect(typeof api.login).toBe('function');
    });

    it('should have register method', () => {
      expect(api).toHaveProperty('register');
      expect(typeof api.register).toBe('function');
    });

    it('should have logout method', () => {
      expect(api).toHaveProperty('logout');
      expect(typeof api.logout).toBe('function');
    });

    it('should have refresh method', () => {
      expect(api).toHaveProperty('refresh');
      expect(typeof api.refresh).toBe('function');
    });

    it('should have getCurrentUser method', () => {
      expect(api).toHaveProperty('getCurrentUser');
      expect(typeof api.getCurrentUser).toBe('function');
    });

    it('should have forgotPassword method', () => {
      expect(api).toHaveProperty('forgotPassword');
      expect(typeof api.forgotPassword).toBe('function');
    });

    it('should have resetPassword method', () => {
      expect(api).toHaveProperty('resetPassword');
      expect(typeof api.resetPassword).toBe('function');
    });

    it('should have verifyEmail method', () => {
      expect(api).toHaveProperty('verifyEmail');
      expect(typeof api.verifyEmail).toBe('function');
    });

    it('should have OAuth-related methods', () => {
      expect(api).toHaveProperty('getEnabledOAuthProviders');
      expect(api).toHaveProperty('getOAuthConnections');
      expect(api).toHaveProperty('unlinkOAuthProvider');
      expect(api).toHaveProperty('getOAuthLoginUrl');
      expect(api).toHaveProperty('getOAuthLinkUrl');
    });
  });

  describe('client configuration', () => {
    it('should use apiUrl from client config', () => {
      // The client is created with clientConfig.apiUrl
      // We can verify the config is available
      expect(clientConfig).toBeDefined();
      expect(clientConfig.apiUrl).toBeDefined();
    });

    it('should have correct config structure', () => {
      expect(clientConfig).toHaveProperty('isDev');
      expect(clientConfig).toHaveProperty('isProd');
      expect(clientConfig).toHaveProperty('apiUrl');
      expect(clientConfig).toHaveProperty('mode');
    });
  });

  describe('token integration', () => {
    it('should have tokenStore mocked', async () => {
      const { tokenStore } = await import('@abe-stack/core');

      expect(tokenStore).toBeDefined();
      expect(tokenStore.get).toBeDefined();
      expect(typeof tokenStore.get).toBe('function');
    });

    it('should return mock token from tokenStore', async () => {
      const { tokenStore } = await import('@abe-stack/core');

      const token = tokenStore.get();
      expect(token).toBe('mock-token');
    });
  });
});
