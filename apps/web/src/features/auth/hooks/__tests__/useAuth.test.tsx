// apps/web/src/features/auth/hooks/__tests__/useAuth.test.tsx
import { ClientEnvironmentProvider } from '@app';
import { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '../useAuth';

import type { ClientConfig, ClientEnvironment } from '@app';
import type { AuthService } from '@features/auth';

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
    fetchCurrentUser: vi.fn(),
    destroy: vi.fn(),
  } as unknown as AuthService;
}

// Create mock environment
function createMockEnvironment(
  authOverrides?: Partial<ReturnType<AuthService['getState']>>,
): ClientEnvironment {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
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
    queryClient,
    auth: createMockAuthService(authOverrides),
  };
}

describe('useAuth', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
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
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
