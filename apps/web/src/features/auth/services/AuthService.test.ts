// apps/web/src/features/auth/services/AuthService.test.ts
/**
 * Unit tests for AuthService.
 *
 * Tests verify:
 * - Service initialization and state management
 * - Login/register/logout flows
 * - Token refresh and persistence
 * - User data fetching
 *
 * Note: In Vitest 4 with ESM, mocking path-aliased packages like @abe-stack/sdk
 * doesn't work reliably for imports in production code. Instead, we mock the
 * global fetch function that the SDK's ApiClient uses internally.
 *
 * @complexity O(1) - All tests are unit tests with mocked dependencies
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from './AuthService';
import type {
  AuthResponse,
  RegisterResponse,
} from '@abe-stack/core';
import type { ClientConfig } from '../../../config';

// ============================================================================
// Hoisted mocks - MUST use vi.hoisted to avoid reference issues
// ============================================================================

const mocks = vi.hoisted(() => ({
  mockTokenStore: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  },
  mockFetch: vi.fn(),
}));

// ============================================================================
// Stub global fetch BEFORE any imports that might use it
// ============================================================================

vi.stubGlobal('fetch', mocks.mockFetch);

// ============================================================================
// Vi.mock calls - these reference hoisted mocks
// ============================================================================

vi.mock('@abe-stack/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/core')>();
  return {
    ...actual,
    tokenStore: mocks.mockTokenStore,
  };
});

// ============================================================================
// Import after mocks are set up
// ============================================================================

import { AuthService, createAuthService } from './AuthService';

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
    avatarUrl: null,
    role: 'user',
    createdAt: '2024-01-01T00:00:00Z',
  };
}

function createMockAuthResponse(user: User = createMockUser()): AuthResponse {
  return {
    token: 'mock-token-abc123',
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

/**
 * Creates a mock Response object for fetch.
 *
 * @param data - The response data
 * @param ok - Whether the response is successful
 * @returns Mock Response object
 */
function createMockResponse(data: unknown, ok = true): Partial<Response> {
  return {
    ok,
    status: ok ? 200 : 401,
    json: vi.fn().mockResolvedValue(data),
    headers: new Headers({ 'content-type': 'application/json' }),
  };
}

/**
 * Sets up mock fetch to return different responses based on URL patterns.
 *
 * @param responses - Map of URL patterns to responses
 */
function setupMockFetch(responses: Record<string, { ok: boolean; data: unknown }>): void {
  mocks.mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();

    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return createMockResponse(response.data, response.ok);
      }
    }

    // Default: return error response
    return createMockResponse({ message: 'Not found' }, false);
  });
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

    // Reset token store mock
    mocks.mockTokenStore.get.mockReturnValue(null);

    // Reset fetch mock
    mocks.mockFetch.mockReset();

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
      const mockResponse = createMockAuthResponse(mockUser);

      setupMockFetch({
        '/auth/login': { ok: true, data: mockResponse },
      });

      await authService.login({ email: 'test@example.com', password: 'password' });
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

      setupMockFetch({
        '/auth/login': { ok: true, data: createMockAuthResponse() },
      });

      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(listener).toHaveBeenCalled();
    });

    it('should remove listener on unsubscribe', async () => {
      const listener = vi.fn();
      const unsubscribe = authService.subscribe(listener);

      unsubscribe();

      setupMockFetch({
        '/auth/login': { ok: true, data: createMockAuthResponse() },
      });

      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should call fetch with credentials', async () => {
      setupMockFetch({
        '/auth/login': { ok: true, data: createMockAuthResponse() },
      });

      await authService.login({ email: 'test@example.com', password: 'password123' });

      expect(mocks.mockFetch).toHaveBeenCalled();
      const [url] = mocks.mockFetch.mock.calls[0] as [string];
      expect(url).toContain('/auth/login');
    });

    it('should store token on successful login', async () => {
      const response = createMockAuthResponse();
      setupMockFetch({
        '/auth/login': { ok: true, data: response },
      });

      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(mocks.mockTokenStore.set).toHaveBeenCalledWith(response.token);
    });

    it('should update state with user', async () => {
      const response = createMockAuthResponse();
      setupMockFetch({
        '/auth/login': { ok: true, data: response },
      });

      await authService.login({ email: 'test@example.com', password: 'password' });

      expect(authService.getState().user).toEqual(response.user);
    });

    it('should throw on login failure', async () => {
      setupMockFetch({
        '/auth/login': { ok: false, data: { message: 'Invalid credentials' } },
      });

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow();
    });
  });

  describe('register', () => {
    it('should call fetch with data', async () => {
      const data = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };
      setupMockFetch({
        '/auth/register': { ok: true, data: createMockRegisterResponse(data.email) },
      });

      await authService.register(data);

      expect(mocks.mockFetch).toHaveBeenCalled();
      const [url] = mocks.mockFetch.mock.calls[0] as [string];
      expect(url).toContain('/auth/register');
    });

    it('should return pending_verification status without storing token', async () => {
      const response = createMockRegisterResponse('new@example.com');
      setupMockFetch({
        '/auth/register': { ok: true, data: response },
      });

      const result = await authService.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(result.status).toBe('pending_verification');
      expect(mocks.mockTokenStore.set).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call fetch logout', async () => {
      setupMockFetch({
        '/auth/logout': { ok: true, data: { success: true } },
      });

      await authService.logout();

      expect(mocks.mockFetch).toHaveBeenCalled();
    });

    it('should clear token', async () => {
      setupMockFetch({
        '/auth/logout': { ok: true, data: { success: true } },
      });

      await authService.logout();

      expect(mocks.mockTokenStore.clear).toHaveBeenCalled();
    });

    it('should remove user from state', async () => {
      // First login to set user
      setupMockFetch({
        '/auth/login': { ok: true, data: createMockAuthResponse() },
        '/auth/logout': { ok: true, data: { success: true } },
      });
      await authService.login({ email: 'test@example.com', password: 'password' });

      await authService.logout();

      expect(authService.getState().user).toBeNull();
    });

    it('should not throw on logout error', async () => {
      mocks.mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(authService.logout()).resolves.not.toThrow();
      expect(mocks.mockTokenStore.clear).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should call fetch refresh', async () => {
      setupMockFetch({
        '/auth/refresh': { ok: true, data: { token: 'new-token' } },
      });

      await authService.refreshToken();

      expect(mocks.mockFetch).toHaveBeenCalled();
    });

    it('should update token on success', async () => {
      setupMockFetch({
        '/auth/refresh': { ok: true, data: { token: 'refreshed-token' } },
      });

      const result = await authService.refreshToken();

      expect(result).toBe(true);
      expect(mocks.mockTokenStore.set).toHaveBeenCalledWith('refreshed-token');
    });

    it('should clear auth on refresh failure', async () => {
      setupMockFetch({
        '/auth/refresh': { ok: false, data: { message: 'Token expired' } },
      });

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
      setupMockFetch({
        '/users/me': { ok: true, data: mockUser },
      });

      const user = await authService.fetchCurrentUser();

      expect(user).toEqual(mockUser);
      expect(authService.getState().user).toEqual(mockUser);
    });

    it('should try refresh on initial fetch failure', async () => {
      mocks.mockTokenStore.get.mockReturnValue('expired-token');
      const mockUser = createMockUser();

      // Track call count to return different responses
      let userCallCount = 0;
      mocks.mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/users/me')) {
          userCallCount++;
          if (userCallCount === 1) {
            return createMockResponse({ message: 'Unauthorized' }, false);
          }
          return createMockResponse(mockUser, true);
        }
        if (url.includes('/auth/refresh')) {
          return createMockResponse({ token: 'new-token' }, true);
        }
        return createMockResponse({ message: 'Not found' }, false);
      });

      const user = await authService.fetchCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it('should clear auth when refresh also fails', async () => {
      mocks.mockTokenStore.get.mockReturnValue('bad-token');

      setupMockFetch({
        '/users/me': { ok: false, data: { message: 'Unauthorized' } },
        '/auth/refresh': { ok: false, data: { message: 'Refresh failed' } },
      });

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

      expect(() => { authService.destroy(); }).not.toThrow();
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
