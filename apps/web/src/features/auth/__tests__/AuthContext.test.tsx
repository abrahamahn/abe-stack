// apps/web/src/features/auth/__tests__/AuthContext.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Define mocks at module level using vi.hoisted to ensure they're available during mock hoisting
const { mockTokenStore, mockApi } = vi.hoisted(() => ({
  mockTokenStore: {
    get: vi.fn(() => null),
    set: vi.fn(),
    clear: vi.fn(),
  },
  mockApi: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock('@abe-stack/shared', () => ({
  tokenStore: mockTokenStore,
}));

vi.mock('../../../api/client', () => ({
  api: mockApi,
}));

import { AuthProvider } from '../AuthContext';
import { useAuth } from '../useAuth';

describe('AuthProvider', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTokenStore.get.mockReturnValue(null);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const createWrapper = (): React.FC<{ children: React.ReactNode }> => {
    return ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };

  describe('Initial State', () => {
    it('should provide initial auth context with null user', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should not be loading when no token exists', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Login', () => {
    it('should call api.login with credentials', async () => {
      mockApi.login.mockResolvedValueOnce({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com', name: 'Test' },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password' });
      });

      expect(mockApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('should store token after successful login', async () => {
      mockApi.login.mockResolvedValueOnce({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com', name: 'Test' },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password' });
      });

      expect(mockTokenStore.set).toHaveBeenCalledWith('test-token');
    });

    it('should update user after successful login', async () => {
      mockApi.login.mockResolvedValueOnce({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password' });
      });

      await waitFor(() => {
        expect(result.current.user).toEqual({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        });
      });
    });
  });

  describe('Register', () => {
    it('should call api.register with data', async () => {
      mockApi.register.mockResolvedValueOnce({
        token: 'test-token',
        user: { id: '1', email: 'new@example.com', name: 'New User' },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'password',
          name: 'New User',
        });
      });

      expect(mockApi.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password',
        name: 'New User',
      });
    });

    it('should store token after successful registration', async () => {
      mockApi.register.mockResolvedValueOnce({
        token: 'new-token',
        user: { id: '1', email: 'new@example.com', name: 'New User' },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'password',
          name: 'New User',
        });
      });

      expect(mockTokenStore.set).toHaveBeenCalledWith('new-token');
    });
  });

  describe('Logout', () => {
    it('should clear token on logout', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockTokenStore.clear).toHaveBeenCalled();
    });

    it('should set user to null after logout', async () => {
      mockApi.login.mockResolvedValueOnce({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com', name: 'Test' },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Login first
      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password' });
      });

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });
  });

  describe('Token Persistence', () => {
    it('should fetch user when token exists on mount', async () => {
      mockTokenStore.get.mockReturnValue('existing-token' as unknown as null);
      mockApi.getCurrentUser.mockResolvedValueOnce({
        id: '1',
        email: 'existing@example.com',
        name: 'Existing User',
      });

      const { result: _result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockApi.getCurrentUser).toHaveBeenCalled();
      });
    });
  });

  describe('Aggressive TDD - Edge Cases', () => {
    it('should handle login API error gracefully', async () => {
      mockApi.login.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.login({ email: 'test@example.com', password: 'password' }),
      ).rejects.toThrow('Network error');
    });

    it('should handle register API error gracefully', async () => {
      mockApi.register.mockRejectedValueOnce(new Error('Email already exists'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.register({
          email: 'test@example.com',
          password: 'password',
          name: 'Test',
        }),
      ).rejects.toThrow('Email already exists');
    });

    it('should handle getCurrentUser API error and clear token', async () => {
      mockTokenStore.get.mockReturnValue('invalid-token' as unknown as null);
      mockApi.getCurrentUser.mockRejectedValueOnce(new Error('Unauthorized'));

      const { result: _result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockTokenStore.clear).toHaveBeenCalled();
      });
    });

    it('should handle malformed API response for login', async () => {
      mockApi.login.mockResolvedValueOnce({
        token: undefined,
        user: undefined,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password' });
      });

      // Should handle undefined token without crashing
      expect(mockTokenStore.set).toHaveBeenCalledWith(undefined);
    });

    it('should handle concurrent login calls', async () => {
      mockApi.login.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                token: 'token',
                user: { id: '1', email: 'test@example.com', name: 'Test' },
              });
            }, 100);
          }),
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Start multiple concurrent logins wrapped in act()
      await act(async () => {
        const loginPromises = [
          result.current.login({ email: 'test1@example.com', password: 'password' }),
          result.current.login({ email: 'test2@example.com', password: 'password' }),
          result.current.login({ email: 'test3@example.com', password: 'password' }),
        ];

        await Promise.all(loginPromises);
      });

      expect(mockApi.login).toHaveBeenCalledTimes(3);
    });

    it('should handle login with empty credentials', async () => {
      mockApi.login.mockResolvedValueOnce({
        token: 'test-token',
        user: { id: '1', email: '', name: '' },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.login({ email: '', password: '' });
      });

      expect(mockApi.login).toHaveBeenCalledWith({ email: '', password: '' });
    });

    it('should handle login with very long credentials', async () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      const longPassword = 'p'.repeat(10000);

      mockApi.login.mockResolvedValueOnce({
        token: 'test-token',
        user: { id: '1', email: longEmail, name: 'Test' },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.login({ email: longEmail, password: longPassword });
      });

      expect(mockApi.login).toHaveBeenCalledWith({ email: longEmail, password: longPassword });
    });

    it('should handle rapid login/logout cycles', async () => {
      mockApi.login.mockResolvedValue({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com', name: 'Test' },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Rapid login/logout cycles
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          await result.current.login({ email: 'test@example.com', password: 'password' });
        });
        await act(async () => {
          await result.current.logout();
        });
      }

      // Should be logged out at the end
      expect(result.current.user).toBeNull();
    });

    it('should handle multiple hook instances correctly', async () => {
      mockApi.login.mockResolvedValueOnce({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com', name: 'Test' },
      });

      const wrapper = createWrapper();

      const { result: result1 } = renderHook(() => useAuth(), { wrapper });
      const { result: result2 } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result1.current.login({ email: 'test@example.com', password: 'password' });
      });

      // Both hooks should reflect the same state
      await waitFor(() => {
        expect(result1.current.user).toEqual(result2.current.user);
      });
    });
  });
});
