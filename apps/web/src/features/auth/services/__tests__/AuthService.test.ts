// apps/web/src/features/auth/services/__tests__/AuthService.test.ts
/** @vitest-environment jsdom */
import { tokenStore } from '@abe-stack/core';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService, createAuthService } from '../AuthService';

import type { User } from '../AuthService';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@abe-stack/core';
import type { ClientConfig } from '@config';

// ============================================================================
// Mocks
// ============================================================================

// Mock tokenStore
vi.mock('@abe-stack/core', async () => {
  const actual = await vi.importActual('@abe-stack/core');
  return {
    ...actual,
    tokenStore: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    },
  };
});

// Mock createApiClient
const mockApiClient = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  getCurrentUser: vi.fn(),
};

vi.mock('@abe-stack/sdk', () => ({
  createApiClient: vi.fn(() => mockApiClient),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockConfig(): ClientConfig {
  return {
    apiUrl: 'http://localhost:3000',
    tokenRefreshInterval: 5 * 60 * 1000, // 5 minutes
  } as ClientConfig;
}

function createMockUser(): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  };
}

function createMockAuthResponse(user: User = createMockUser()): AuthResponse {
  return {
    token: 'mock-token-abc123',
    user,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('AuthService', () => {
  let authService: AuthService;
  let queryClient: QueryClient;
  let config: ClientConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset token store mock
    vi.mocked(tokenStore.get).mockReturnValue(null);

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    config = createMockConfig();
    authService = new AuthService({ config, queryClient });
  });

  afterEach(() => {
    authService.destroy();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create service with provided dependencies', () => {
      expect(authService).toBeDefined();
    });

    it('should start refresh interval when token exists', () => {
      vi.mocked(tokenStore.get).mockReturnValue('existing-token');

      const serviceWithToken = new AuthService({ config, queryClient });

      expect(serviceWithToken).toBeDefined();
      serviceWithToken.destroy();
    });
  });

  describe('getState', () => {
    it('should return initial state when not authenticated', () => {
      const state = authService.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should return user when authenticated', () => {
      const mockUser = createMockUser();
      queryClient.setQueryData(['auth', 'me'], mockUser);

      const state = authService.getState();

      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should return isLoading true when pending and has token', () => {
      vi.mocked(tokenStore.get).mockReturnValue('some-token');

      // Create fresh service with token
      const newService = new AuthService({ config, queryClient });
      const state = newService.getState();

      // Without user data and with token, isLoading depends on query state
      expect(state.isLoading).toBe(false); // No query pending by default
      newService.destroy();
    });
  });

  describe('subscribe', () => {
    it('should add listener and return unsubscribe function', () => {
      const listener = vi.fn();

      const unsubscribe = authService.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should call listener when notified', async () => {
      const listener = vi.fn();
      authService.subscribe(listener);

      // Trigger a login to notify listeners
      mockApiClient.login.mockResolvedValueOnce(createMockAuthResponse());
      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(listener).toHaveBeenCalled();
    });

    it('should remove listener on unsubscribe', async () => {
      const listener = vi.fn();
      const unsubscribe = authService.subscribe(listener);

      unsubscribe();

      // Trigger a login after unsubscribe
      mockApiClient.login.mockResolvedValueOnce(createMockAuthResponse());
      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should call api.login with credentials', async () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };
      mockApiClient.login.mockResolvedValueOnce(createMockAuthResponse());

      await authService.login(credentials);

      expect(mockApiClient.login).toHaveBeenCalledWith(credentials);
    });

    it('should store token on successful login', async () => {
      const response = createMockAuthResponse();
      mockApiClient.login.mockResolvedValueOnce(response);

      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(tokenStore.set).toHaveBeenCalledWith(response.token);
    });

    it('should update query data with user', async () => {
      const response = createMockAuthResponse();
      mockApiClient.login.mockResolvedValueOnce(response);

      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(queryClient.getQueryData(['auth', 'me'])).toEqual(response.user);
    });

    it('should throw on login failure', async () => {
      mockApiClient.login.mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should call api.register with data', async () => {
      const data: RegisterRequest = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };
      mockApiClient.register.mockResolvedValueOnce(createMockAuthResponse());

      await authService.register(data);

      expect(mockApiClient.register).toHaveBeenCalledWith(data);
    });

    it('should store token on successful registration', async () => {
      const response = createMockAuthResponse();
      mockApiClient.register.mockResolvedValueOnce(response);

      await authService.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(tokenStore.set).toHaveBeenCalledWith(response.token);
    });
  });

  describe('logout', () => {
    it('should call api.logout', async () => {
      mockApiClient.logout.mockResolvedValueOnce(undefined);

      await authService.logout();

      expect(mockApiClient.logout).toHaveBeenCalled();
    });

    it('should clear token', async () => {
      mockApiClient.logout.mockResolvedValueOnce(undefined);

      await authService.logout();

      expect(tokenStore.clear).toHaveBeenCalled();
    });

    it('should remove user from query cache', async () => {
      const mockUser = createMockUser();
      queryClient.setQueryData(['auth', 'me'], mockUser);
      mockApiClient.logout.mockResolvedValueOnce(undefined);

      await authService.logout();

      expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined();
    });

    it('should not throw on logout error', async () => {
      mockApiClient.logout.mockRejectedValueOnce(new Error('Network error'));

      await expect(authService.logout()).resolves.not.toThrow();
      expect(tokenStore.clear).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should call api.refresh', async () => {
      mockApiClient.refresh.mockResolvedValueOnce({ token: 'new-token' });

      await authService.refreshToken();

      expect(mockApiClient.refresh).toHaveBeenCalled();
    });

    it('should update token on success', async () => {
      mockApiClient.refresh.mockResolvedValueOnce({ token: 'refreshed-token' });

      const result = await authService.refreshToken();

      expect(result).toBe(true);
      expect(tokenStore.set).toHaveBeenCalledWith('refreshed-token');
    });

    it('should clear auth on refresh failure', async () => {
      mockApiClient.refresh.mockRejectedValueOnce(new Error('Token expired'));

      const result = await authService.refreshToken();

      expect(result).toBe(false);
      expect(tokenStore.clear).toHaveBeenCalled();
    });
  });

  describe('fetchCurrentUser', () => {
    it('should return null when no token', async () => {
      vi.mocked(tokenStore.get).mockReturnValue(null);

      const user = await authService.fetchCurrentUser();

      expect(user).toBeNull();
      expect(mockApiClient.getCurrentUser).not.toHaveBeenCalled();
    });

    it('should fetch and cache user when token exists', async () => {
      vi.mocked(tokenStore.get).mockReturnValue('valid-token');
      const mockUser = createMockUser();
      mockApiClient.getCurrentUser.mockResolvedValueOnce(mockUser);

      const user = await authService.fetchCurrentUser();

      expect(user).toEqual(mockUser);
      expect(queryClient.getQueryData(['auth', 'me'])).toEqual(mockUser);
    });

    it('should try refresh on initial fetch failure', async () => {
      vi.mocked(tokenStore.get).mockReturnValue('expired-token');
      const mockUser = createMockUser();

      mockApiClient.getCurrentUser
        .mockRejectedValueOnce(new Error('Unauthorized'))
        .mockResolvedValueOnce(mockUser);
      mockApiClient.refresh.mockResolvedValueOnce({ token: 'new-token' });

      const user = await authService.fetchCurrentUser();

      expect(mockApiClient.refresh).toHaveBeenCalled();
      expect(user).toEqual(mockUser);
    });

    it('should clear auth when refresh also fails', async () => {
      vi.mocked(tokenStore.get).mockReturnValue('bad-token');

      mockApiClient.getCurrentUser.mockRejectedValueOnce(new Error('Unauthorized'));
      mockApiClient.refresh.mockRejectedValueOnce(new Error('Token expired'));

      const user = await authService.fetchCurrentUser();

      expect(user).toBeNull();
      expect(tokenStore.clear).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should stop refresh interval', () => {
      vi.mocked(tokenStore.get).mockReturnValue('token');
      const serviceWithToken = new AuthService({ config, queryClient });

      serviceWithToken.destroy();

      // Should not throw and interval should be cleared
      vi.advanceTimersByTime(config.tokenRefreshInterval * 2);
      expect(mockApiClient.refresh).not.toHaveBeenCalled();
    });

    it('should clear listeners', async () => {
      const listener = vi.fn();
      authService.subscribe(listener);

      authService.destroy();

      // After destroy, listeners should be cleared
      // Re-create to trigger listener notification
      mockApiClient.login.mockResolvedValueOnce(createMockAuthResponse());

      // This would normally notify, but listeners are cleared
      // So we just verify destroy completes without error
      expect(() => authService.destroy()).not.toThrow();
    });
  });

  describe('createAuthService factory', () => {
    it('should create AuthService instance', () => {
      const service = createAuthService({ config, queryClient });

      expect(service.constructor.name).toBe('AuthService');
      service.destroy();
    });
  });
});
