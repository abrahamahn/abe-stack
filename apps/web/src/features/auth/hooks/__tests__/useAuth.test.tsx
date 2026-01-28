// apps/web/src/features/auth/hooks/__tests__/useAuth.test.tsx
import { QueryCache } from '@abe-stack/sdk';
import { ClientEnvironmentProvider } from '@app/ClientEnvironment';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '../useAuth';

import type { ClientEnvironment } from '@app/ClientEnvironment';
import type { ClientConfig } from '@/config';
import type { AuthService } from '@auth/services/AuthService';

// Create a mock AuthService
function createMockAuthService(
  overrides?: Partial<ReturnType<AuthService['getState']>>,
): AuthService {
  const state = {
    user: overrides?.user ?? null,
    isLoading: overrides?.isLoading ?? false,
    isAuthenticated: overrides?.isAuthenticated ?? false,
  };

  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn().mockResolvedValue(true),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    fetchCurrentUser: vi.fn(),
    destroy: vi.fn(),
  } as unknown as AuthService;
}

// Create mock environment
function createMockEnvironment(
  authOverrides?: Partial<ReturnType<AuthService['getState']>>,
): ClientEnvironment {
  const queryCache = new QueryCache({
    defaultStaleTime: 0,
    defaultGcTime: 0,
  });

  const mockConfig: ClientConfig = {
    mode: 'test',
    isDev: false,
    isProd: false,
    apiUrl: '',
    tokenRefreshInterval: 13 * 60 * 1000,
    uiVersion: '1.0.0',
  };

  return {
    config: mockConfig,
    queryCache,
    auth: createMockAuthService(authOverrides),
  };
}

describe('useAuth', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    role: 'user' as const,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const createWrapper = (env: ClientEnvironment): React.FC<{ children: React.ReactNode }> => {
    return ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <ClientEnvironmentProvider value={env}>{children}</ClientEnvironmentProvider>
    );
  };

  it('should return auth state when used within ClientEnvironmentProvider', () => {
    const env = createMockEnvironment({ user: mockUser, isAuthenticated: true });
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(env),
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should return user from auth service', () => {
    const env = createMockEnvironment({ user: mockUser, isAuthenticated: true });
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(env),
    });

    expect(result.current.user).toEqual({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      role: 'user',
      createdAt: '2024-01-01T00:00:00Z',
    });
  });

  it('should return isLoading from auth service', () => {
    const env = createMockEnvironment({ isLoading: true });
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(env),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should return isAuthenticated from auth service', () => {
    const env = createMockEnvironment({ user: mockUser, isAuthenticated: true });
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(env),
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should provide login function', () => {
    const env = createMockEnvironment();
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(env),
    });

    expect(typeof result.current.login).toBe('function');
  });

  it('should provide register function', () => {
    const env = createMockEnvironment();
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(env),
    });

    expect(typeof result.current.register).toBe('function');
  });

  it('should provide logout function', () => {
    const env = createMockEnvironment();
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(env),
    });

    expect(typeof result.current.logout).toBe('function');
  });

  it('should throw error when used outside ClientEnvironmentProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useClientEnvironment must be used within ClientEnvironmentProvider');

    consoleSpy.mockRestore();
  });

  it('should handle null user', () => {
    const env = createMockEnvironment({ user: null, isAuthenticated: false });
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(env),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
