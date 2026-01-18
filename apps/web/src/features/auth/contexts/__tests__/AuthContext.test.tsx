// apps/web/src/features/auth/contexts/__tests__/AuthContext.test.tsx
/** @vitest-environment jsdom */
/**
 * AuthContext Tests
 *
 * Note: The AuthContext is now a backward-compatibility wrapper that:
 * 1. Uses useAuth() hook internally (which uses ClientEnvironment)
 * 2. Provides the auth state via React context
 *
 * These tests verify the backward-compatibility layer works correctly.
 * For comprehensive auth testing, see useAuth.test.tsx.
 */
import { ClientEnvironmentProvider } from '@app';
import { QueryClient } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import React, { useContext } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, AuthProvider } from '../AuthContext';

import type { ClientConfig, ClientEnvironment } from '@app';
import type { AuthService } from '@features/auth';

// Create a mock AuthService with controllable state
function createMockAuthService(initialState?: {
  user?: { id: string; email: string; name: string | null; role: 'user' | 'admin' } | null;
  isLoading?: boolean;
  isAuthenticated?: boolean;
}): AuthService {
  let state = {
    user: initialState?.user ?? null,
    isLoading: initialState?.isLoading ?? false,
    isAuthenticated: initialState?.isAuthenticated ?? false,
  };

  const listeners = new Set<() => void>();

  const notifyListeners = (): void => {
    listeners.forEach((l) => l());
  };

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    login: vi.fn().mockImplementation(async () => {
      state = {
        user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
        isLoading: false,
        isAuthenticated: true,
      };
      notifyListeners();
    }),
    register: vi.fn().mockImplementation(async () => {
      state = {
        user: { id: '1', email: 'new@example.com', name: 'New User', role: 'user' },
        isLoading: false,
        isAuthenticated: true,
      };
      notifyListeners();
    }),
    logout: vi.fn().mockImplementation(async () => {
      state = { user: null, isLoading: false, isAuthenticated: false };
      notifyListeners();
    }),
    refreshToken: vi.fn().mockResolvedValue(true),
    fetchCurrentUser: vi.fn(),
    destroy: vi.fn(),
  } as unknown as AuthService;
}

// Create mock environment
function createMockEnvironment(authService?: AuthService): ClientEnvironment {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const mockConfig: ClientConfig = {
    mode: 'test',
    isDev: false,
    isProd: false,
    apiUrl: 'http://localhost:8080',
    tokenRefreshInterval: 13 * 60 * 1000,
    uiVersion: '1.0.0',
  };

  return {
    config: mockConfig,
    queryClient,
    auth: authService ?? createMockAuthService(),
  };
}

describe('AuthProvider', () => {
  let mockEnv: ClientEnvironment;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = createMockEnvironment();
  });

  const createWrapper = (
    env: ClientEnvironment = mockEnv,
  ): React.FC<{ children: React.ReactNode }> => {
    return ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <ClientEnvironmentProvider value={env}>
        <AuthProvider>{children}</AuthProvider>
      </ClientEnvironmentProvider>
    );
  };

  // Helper to access AuthContext directly
  const useAuthContext = () => {
    return useContext(AuthContext);
  };

  describe('Initial State', () => {
    it('should provide initial auth context with null user', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current?.user).toBeNull();
      expect(result.current?.isAuthenticated).toBe(false);
    });

    it('should not be loading when no token exists', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current?.isLoading).toBe(false);
    });
  });

  describe('Login', () => {
    it('should provide login function', async () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current?.login).toBe('function');
    });

    it('should update user after successful login', async () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current?.login({ email: 'test@example.com', password: 'password' });
      });

      await waitFor(() => {
        expect(result.current?.user).toEqual({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        });
        expect(result.current?.isAuthenticated).toBe(true);
      });
    });
  });

  describe('Register', () => {
    it('should provide register function', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current?.register).toBe('function');
    });

    it('should update user after successful registration', async () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current?.register({
          email: 'new@example.com',
          password: 'password',
          name: 'New User',
        });
      });

      await waitFor(() => {
        expect(result.current?.user).toEqual({
          id: '1',
          email: 'new@example.com',
          name: 'New User',
          role: 'user',
        });
      });
    });
  });

  describe('Logout', () => {
    it('should provide logout function', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current?.logout).toBe('function');
    });

    it('should set user to null after logout', async () => {
      // Start with authenticated user
      const authService = createMockAuthService({
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
        isAuthenticated: true,
      });
      const env = createMockEnvironment(authService);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(env),
      });

      // Verify we start authenticated
      expect(result.current?.isAuthenticated).toBe(true);

      // Logout
      await act(async () => {
        await result.current?.logout();
      });

      await waitFor(() => {
        expect(result.current?.user).toBeNull();
        expect(result.current?.isAuthenticated).toBe(false);
      });
    });
  });

  describe('Context Value', () => {
    it('should provide refreshToken function', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current?.refreshToken).toBe('function');
    });

    it('should provide all auth methods', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toMatchObject({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        login: expect.any(Function),
        register: expect.any(Function),
        logout: expect.any(Function),
        refreshToken: expect.any(Function),
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with components that use useContext(AuthContext)', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      // Should have all the expected properties
      expect(result.current).toBeDefined();
      expect('user' in (result.current ?? {})).toBe(true);
      expect('isAuthenticated' in (result.current ?? {})).toBe(true);
      expect('login' in (result.current ?? {})).toBe(true);
    });
  });
});
