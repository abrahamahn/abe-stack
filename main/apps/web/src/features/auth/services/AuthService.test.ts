// main/apps/web/src/features/auth/services/AuthService.test.ts
/**
 * Unit tests for AuthService.
 *
 * Tests verify:
 * - Service initialization and state management
 * - Login/register/logout flows
 * - Token refresh and persistence
 * - User data fetching
 *
 * @complexity O(1) - All tests are unit tests with mocked dependencies
 */

import { afterEach, beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Hoisted mocks - MUST use vi.hoisted to avoid reference issues
// ============================================================================

const mocks = vi.hoisted(() => ({
  mockTokenStore: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  },
  mockApiClient: {
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    getEnabledOAuthProviders: vi.fn(),
    getOAuthConnections: vi.fn(),
    unlinkOAuthProvider: vi.fn(),
    getOAuthLoginUrl: vi.fn(),
    getOAuthLinkUrl: vi.fn(),
  },
}));

// ============================================================================
// Vi.mock calls - these reference hoisted mocks
// ============================================================================

vi.mock('@abe-stack/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...actual,
    tokenStore: mocks.mockTokenStore,
  };
});

vi.mock('@abe-stack/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/api')>();
  return {
    ...actual,
    getApiClient: () => mocks.mockApiClient,
    createApiClient: () => mocks.mockApiClient, // fallback if needed by other internals, but usage is blocked
  };
});

// ============================================================================
// Import after mocks are set up
// ============================================================================

import { AuthService, createAuthService } from './AuthService';

import type { ClientConfig } from '../../../config';
import type { LoginSuccessResponse, RegisterResponse, User } from '@abe-stack/api';
import type { UserId } from '@abe-stack/shared';

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
    id: 'user-123' as unknown as UserId,
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

function createMockLoginResponse(user: User = createMockUser()): LoginSuccessResponse {
  return {
    user,
  };
}

function createMockRegisterResponse(email = 'new@example.com'): RegisterResponse {
  return {
    status: 'pending_verification',
    message: 'Please check your email to verify your account',
    email,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('AuthService', () => {
  let authService: AuthService;
  let config: ClientConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    globalThis.localStorage.clear();

    // Reset token store mock
    mocks.mockTokenStore.get.mockReturnValue(null);

    // Reset api client mocks
    Object.values(mocks.mockApiClient).forEach((mock) => {
      if (typeof mock === 'function' && 'mockReset' in mock) {
        mock.mockReset();
      }
    });

    // Mock global listeners
    globalThis.addEventListener = vi.fn();
    globalThis.removeEventListener = vi.fn();

    config = createMockConfig();
    authService = new AuthService({ config });
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
      mocks.mockTokenStore.get.mockReturnValue('existing-token');

      const serviceWithToken = new AuthService({ config });

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

    it('should return user when authenticated', async () => {
      const mockUser = createMockUser();
      const mockResponse = createMockLoginResponse(mockUser);

      mocks.mockApiClient.login.mockResolvedValue(mockResponse);

      await authService.login({ identifier: 'test@example.com', password: 'password' });
      const state = authService.getState();

      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should return isLoading false when pending without user fetch', () => {
      mocks.mockTokenStore.get.mockReturnValue('some-token');

      const newService = new AuthService({ config });
      const state = newService.getState();

      expect(state.isLoading).toBe(false);
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

      mocks.mockApiClient.login.mockResolvedValue(createMockLoginResponse());

      await authService.login({ identifier: 'test@example.com', password: 'password' });

      expect(listener).toHaveBeenCalled();
    });

    it('should remove listener on unsubscribe', async () => {
      const listener = vi.fn();
      const unsubscribe = authService.subscribe(listener);

      unsubscribe();

      mocks.mockApiClient.login.mockResolvedValue(createMockLoginResponse());

      await authService.login({ identifier: 'test@example.com', password: 'password' });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should call api client with credentials', async () => {
      mocks.mockApiClient.login.mockResolvedValue(createMockLoginResponse());

      await authService.login({ identifier: 'test@example.com', password: 'password123' });

      expect(mocks.mockApiClient.login).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'password123',
      });
    });

    it('should clear stale token and hydrate session on successful login', async () => {
      const response = createMockLoginResponse();
      mocks.mockApiClient.login.mockResolvedValue(response);
      mocks.mockApiClient.refresh.mockResolvedValue({ token: 'refreshed-token' });
      mocks.mockApiClient.getCurrentUser.mockResolvedValue(response.user);

      await authService.login({ identifier: 'test@example.com', password: 'password' });

      expect(mocks.mockTokenStore.clear).toHaveBeenCalled();
      expect(mocks.mockTokenStore.set).toHaveBeenCalledWith('refreshed-token');
    });

    it('should update state with user', async () => {
      const response = createMockLoginResponse();
      mocks.mockApiClient.login.mockResolvedValue(response);

      await authService.login({ identifier: 'test@example.com', password: 'password' });

      expect(authService.getState().user).toEqual(response.user);
    });

    it('should hydrate real user after tokenless cookie-session login', async () => {
      authService.destroy();
      authService = new AuthService({
        config,
      });

      const fallbackUser = {
        ...createMockUser(),
        email: 'user@local.invalid',
      };
      const realUser = {
        ...createMockUser(),
        email: 'real@example.com',
      };
      mocks.mockApiClient.login.mockResolvedValue({
        user: fallbackUser,
      });
      mocks.mockApiClient.refresh.mockResolvedValue({ token: 'refreshed-token' });
      mocks.mockApiClient.getCurrentUser.mockResolvedValue(realUser);

      await authService.login({ identifier: 'test@example.com', password: 'password' });

      expect(mocks.mockTokenStore.clear).toHaveBeenCalled();
      expect(mocks.mockApiClient.refresh).toHaveBeenCalled();
      expect(mocks.mockTokenStore.set).toHaveBeenCalledWith('refreshed-token');
      expect(mocks.mockApiClient.getCurrentUser).toHaveBeenCalled();
      expect(authService.getState().user?.email).toBe('real@example.com');
    });

    it('should normalize missing first/last names from login response', async () => {
      const malformedUser = {
        ...createMockUser(),
        firstName: undefined as unknown as string,
        lastName: undefined as unknown as string,
      };
      mocks.mockApiClient.login.mockResolvedValue(createMockLoginResponse(malformedUser));

      await authService.login({ identifier: 'test@example.com', password: 'password' });

      expect(authService.getState().user?.firstName).toBe('');
      expect(authService.getState().user?.lastName).toBe('');
    });

    it('should throw on login failure', async () => {
      mocks.mockApiClient.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        authService.login({ identifier: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow();
    });
  });

  describe('register', () => {
    it('should call api client with data', async () => {
      const data = {
        email: 'new@example.com',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
        tosAccepted: true,
      };
      mocks.mockApiClient.register.mockResolvedValue(createMockRegisterResponse(data.email));

      await authService.register(data);

      expect(mocks.mockApiClient.register).toHaveBeenCalledWith(data);
    });

    it('should return pending_verification status without storing token', async () => {
      const response = createMockRegisterResponse('new@example.com');
      mocks.mockApiClient.register.mockResolvedValue(response);

      const result = await authService.register({
        email: 'new@example.com',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
        tosAccepted: true,
      });

      expect(result.status).toBe('pending_verification');
      expect(mocks.mockTokenStore.set).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call api client logout', async () => {
      mocks.mockApiClient.logout.mockResolvedValue({ success: true });

      await authService.logout();

      expect(mocks.mockApiClient.logout).toHaveBeenCalled();
    });

    it('should clear token', async () => {
      mocks.mockApiClient.logout.mockResolvedValue({ success: true });

      await authService.logout();

      expect(mocks.mockTokenStore.clear).toHaveBeenCalled();
    });

    it('should remove user from state', async () => {
      // First login to set user
      mocks.mockApiClient.login.mockResolvedValue(createMockLoginResponse());
      await authService.login({ identifier: 'test@example.com', password: 'password' });

      mocks.mockApiClient.logout.mockResolvedValue({ success: true });
      await authService.logout();

      expect(authService.getState().user).toBeNull();
    });

    it('should not throw on logout error', async () => {
      mocks.mockApiClient.logout.mockRejectedValue(new Error('Network error'));

      await expect(authService.logout()).resolves.not.toThrow();
      expect(mocks.mockTokenStore.clear).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should call api client refresh', async () => {
      mocks.mockApiClient.refresh.mockResolvedValue({ token: 'new-token' });

      await authService.refreshToken();

      expect(mocks.mockApiClient.refresh).toHaveBeenCalled();
    });

    it('should update token on success', async () => {
      mocks.mockApiClient.refresh.mockResolvedValue({ token: 'refreshed-token' });

      const result = await authService.refreshToken();

      expect(result).toBe(true);
      expect(mocks.mockTokenStore.set).toHaveBeenCalledWith('refreshed-token');
    });

    it('should clear auth on refresh failure', async () => {
      mocks.mockApiClient.refresh.mockRejectedValue(new Error('Token expired'));

      const result = await authService.refreshToken();

      expect(result).toBe(false);
      expect(mocks.mockTokenStore.clear).toHaveBeenCalled();
    });
  });

  describe('fetchCurrentUser', () => {
    it('should return null when no token', async () => {
      mocks.mockTokenStore.get.mockReturnValue(null);

      const user = await authService.fetchCurrentUser();

      expect(user).toBeNull();
    });

    it('should fetch and cache user when token exists', async () => {
      mocks.mockTokenStore.get.mockReturnValue('valid-token');
      const mockUser = createMockUser();
      mocks.mockApiClient.getCurrentUser.mockResolvedValue(mockUser);

      const user = await authService.fetchCurrentUser();

      expect(user).toEqual(mockUser);
      expect(authService.getState().user).toEqual(mockUser);
    });

    it('should normalize missing first/last names from current user response', async () => {
      mocks.mockTokenStore.get.mockReturnValue('valid-token');
      const malformedUser = {
        ...createMockUser(),
        firstName: undefined as unknown as string,
        lastName: undefined as unknown as string,
      };
      mocks.mockApiClient.getCurrentUser.mockResolvedValue(malformedUser);

      const user = await authService.fetchCurrentUser();

      expect(user?.firstName).toBe('');
      expect(user?.lastName).toBe('');
      expect(authService.getState().user?.firstName).toBe('');
      expect(authService.getState().user?.lastName).toBe('');
    });

    it('should try refresh on initial fetch failure', async () => {
      mocks.mockTokenStore.get.mockReturnValue('expired-token');
      const mockUser = createMockUser();

      // First call fails, then refresh succeeds, then second call succeeds
      mocks.mockApiClient.getCurrentUser
        .mockRejectedValueOnce(new Error('Unauthorized'))
        .mockResolvedValueOnce(mockUser);
      mocks.mockApiClient.refresh.mockResolvedValue({ token: 'new-token' });

      const user = await authService.fetchCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it('should clear auth when refresh also fails', async () => {
      mocks.mockTokenStore.get.mockReturnValue('bad-token');

      mocks.mockApiClient.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
      mocks.mockApiClient.refresh.mockRejectedValue(new Error('Refresh failed'));

      const user = await authService.fetchCurrentUser();

      expect(user).toBeNull();
      expect(mocks.mockTokenStore.clear).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should stop refresh interval', () => {
      mocks.mockTokenStore.get.mockReturnValue('token');
      const serviceWithToken = new AuthService({ config });

      serviceWithToken.destroy();

      // Should not throw and interval should be cleared
      expect(() => vi.advanceTimersByTime(config.tokenRefreshInterval * 2)).not.toThrow();
    });

    it('should not throw when called multiple times', () => {
      authService.destroy();

      expect(() => {
        authService.destroy();
      }).not.toThrow();
    });
  });

  describe('createAuthService factory', () => {
    it('should create AuthService instance', () => {
      const service = createAuthService({ config });

      expect(service.constructor.name).toBe('AuthService');
      service.destroy();
    });
  });
});
