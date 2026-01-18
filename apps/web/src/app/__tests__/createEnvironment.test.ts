// apps/web/src/app/__tests__/createEnvironment.test.ts
/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createClientEnvironment,
  createPersister,
  getClientEnvironment,
  resetClientEnvironment,
} from '../createEnvironment';

// Use ReturnType to avoid circular import with ClientEnvironment.tsx
type ClientEnvironment = ReturnType<typeof createClientEnvironment>;

// ============================================================================
// Mocks
// ============================================================================

// Mock clientConfig
vi.mock('@config', () => ({
  clientConfig: {
    apiUrl: 'http://localhost:3000/api',
    tokenRefreshInterval: 5 * 60 * 1000,
  },
}));

// Mock tokenStore
vi.mock('@abe-stack/core', async () => {
  const actual = await vi.importActual('@abe-stack/core');
  return {
    ...actual,
    tokenStore: {
      get: vi.fn(() => null),
      set: vi.fn(),
      clear: vi.fn(),
    },
  };
});

// Mock createApiClient
vi.mock('@abe-stack/sdk', () => ({
  createApiClient: vi.fn(() => ({
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    getCurrentUser: vi.fn(),
  })),
  createQueryPersister: vi.fn(() => ({
    persistClient: vi.fn(),
    restoreClient: vi.fn().mockResolvedValue(undefined),
    removeClient: vi.fn(),
  })),
}));

// ============================================================================
// Tests
// ============================================================================

describe('createEnvironment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton before each test
    resetClientEnvironment();
  });

  afterEach(() => {
    resetClientEnvironment();
  });

  describe('createClientEnvironment', () => {
    it('should create environment with all services', () => {
      const env = createClientEnvironment();

      expect(env).toBeDefined();
      expect(env.config).toBeDefined();
      expect(env.queryClient).toBeDefined();
      expect(env.auth).toBeDefined();
    });

    it('should create new instances each time', () => {
      const env1 = createClientEnvironment();
      const env2 = createClientEnvironment();

      // Each call creates new instances
      expect(env1).not.toBe(env2);
      expect(env1.queryClient).not.toBe(env2.queryClient);

      // Clean up
      env1.auth.destroy();
      env2.auth.destroy();
    });

    it('should configure query client with default options', () => {
      const env = createClientEnvironment();

      // QueryClient is created with staleTime and gcTime
      expect(env.queryClient).toBeDefined();
      expect(typeof env.queryClient.getQueryData).toBe('function');

      env.auth.destroy();
    });

    it('should create auth service with config and queryClient', () => {
      const env = createClientEnvironment();

      // AuthService should be functional
      expect(env.auth).toBeDefined();
      expect(typeof env.auth.getState).toBe('function');
      expect(typeof env.auth.login).toBe('function');
      expect(typeof env.auth.logout).toBe('function');

      env.auth.destroy();
    });

    it('should use clientConfig from @config', () => {
      const env = createClientEnvironment();

      expect(env.config.apiUrl).toBe('http://localhost:3000/api');
      expect(env.config.tokenRefreshInterval).toBe(5 * 60 * 1000);

      env.auth.destroy();
    });
  });

  describe('createPersister', () => {
    it('should create persister with options', () => {
      const persister = createPersister();

      expect(persister).toBeDefined();
    });

    it('should have required persister methods', () => {
      const persister = createPersister();

      expect(typeof persister.persistClient).toBe('function');
      expect(typeof persister.restoreClient).toBe('function');
      expect(typeof persister.removeClient).toBe('function');
    });
  });

  describe('getClientEnvironment', () => {
    it('should return singleton instance', () => {
      const env1 = getClientEnvironment();
      const env2 = getClientEnvironment();

      expect(env1).toBe(env2);
    });

    it('should create environment on first call', () => {
      const env = getClientEnvironment();

      expect(env).toBeDefined();
      expect(env.config).toBeDefined();
      expect(env.queryClient).toBeDefined();
      expect(env.auth).toBeDefined();
    });

    it('should reuse same instance on subsequent calls', () => {
      const env1 = getClientEnvironment();
      const env2 = getClientEnvironment();
      const env3 = getClientEnvironment();

      expect(env1).toBe(env2);
      expect(env2).toBe(env3);
    });
  });

  describe('resetClientEnvironment', () => {
    it('should clear singleton instance', () => {
      const env1 = getClientEnvironment();
      resetClientEnvironment();
      const env2 = getClientEnvironment();

      expect(env1).not.toBe(env2);
    });

    it('should call destroy on auth service', () => {
      const env = getClientEnvironment();
      const destroySpy = vi.spyOn(env.auth, 'destroy');

      resetClientEnvironment();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('should handle reset when no environment exists', () => {
      // First reset to ensure clean state
      resetClientEnvironment();

      // Second reset should not throw
      expect(() => resetClientEnvironment()).not.toThrow();
    });
  });

  describe('environment integration', () => {
    it('should have working config access', () => {
      const env = getClientEnvironment();

      expect(env.config.apiUrl).toBeDefined();
      expect(typeof env.config.apiUrl).toBe('string');
    });

    it('should have working auth service', () => {
      const env = getClientEnvironment();

      const state = env.auth.getState();

      expect(state).toBeDefined();
      expect(typeof state.isAuthenticated).toBe('boolean');
      expect(typeof state.isLoading).toBe('boolean');
    });

    it('should have working query client', () => {
      const env = getClientEnvironment();

      // Can set and get query data
      env.queryClient.setQueryData(['test', 'key'], { data: 'value' });
      const data = env.queryClient.getQueryData(['test', 'key']);

      expect(data).toEqual({ data: 'value' });
    });
  });

  describe('type safety', () => {
    it('should return ClientEnvironment type', () => {
      const env: ClientEnvironment = getClientEnvironment();

      // TypeScript should allow this assignment
      expect(env.config).toBeDefined();
      expect(env.queryClient).toBeDefined();
      expect(env.auth).toBeDefined();
    });
  });
});
