// apps/web/src/features/auth/hooks/__tests__/useAuth.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextType } from '../../contexts/AuthContext';
import { useAuth } from '../useAuth';

describe('useAuth', () => {
  const mockAuthContext: AuthContextType = {
    user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  };

  const createWrapper = (
    value: AuthContextType | undefined,
  ): React.FC<{ children: React.ReactNode }> => {
    return ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <AuthContext.Provider value={value as AuthContextType}>{children}</AuthContext.Provider>
    );
  };

  it('should return auth context when used within AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(mockAuthContext),
    });

    expect(result.current).toBe(mockAuthContext);
  });

  it('should return user from context', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(mockAuthContext),
    });

    expect(result.current.user).toEqual({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    });
  });

  it('should return isLoading from context', () => {
    const loadingContext = { ...mockAuthContext, isLoading: true };
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(loadingContext),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should return isAuthenticated from context', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(mockAuthContext),
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should provide login function', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(mockAuthContext),
    });

    expect(typeof result.current.login).toBe('function');
  });

  it('should provide register function', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(mockAuthContext),
    });

    expect(typeof result.current.register).toBe('function');
  });

  it('should provide logout function', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(mockAuthContext),
    });

    expect(typeof result.current.logout).toBe('function');
  });

  it('should throw error when used outside AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('should handle null user', () => {
    const nullUserContext = { ...mockAuthContext, user: null, isAuthenticated: false };
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(nullUserContext),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
