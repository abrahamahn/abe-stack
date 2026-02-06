// client/src/oauth/hooks.test.ts
/**
 * OAuth Hooks Unit Tests
 *
 * Comprehensive tests for OAuth React hooks:
 * - useEnabledOAuthProviders: Fetch enabled OAuth providers
 * - useOAuthConnections: Manage connected OAuth accounts
 * - getOAuthLoginUrl: Helper to generate OAuth login URLs
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../api/client';

import {
  getOAuthLoginUrl,
  oauthQueryKeys,
  useEnabledOAuthProviders,
  useOAuthConnections,
} from './hooks';

import type { ApiClient, ApiClientConfig } from '../api/client';
import type { OAuthConnection, OAuthProvider } from '@abe-stack/shared';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../api/client', () => ({
  createApiClient: vi.fn(),
}));

const mockCreateApiClient = vi.mocked(createApiClient);

// ============================================================================
// Test Data Factories
// ============================================================================

const createMockOAuthConnection = (overrides?: Partial<OAuthConnection>): OAuthConnection => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  provider: 'google' as OAuthProvider,
  providerEmail: 'user@example.com',
  connectedAt: new Date('2024-01-15T10:00:00Z'),
  ...overrides,
});

const createMockApiClient = (overrides?: Partial<ApiClient>): ApiClient => ({
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  getEnabledOAuthProviders: vi.fn().mockResolvedValue({ providers: [] }),
  getOAuthConnections: vi.fn().mockResolvedValue({ connections: [] }),
  unlinkOAuthProvider: vi.fn().mockResolvedValue({ message: 'Unlinked' }),
  getOAuthLoginUrl: vi.fn(
    (provider: OAuthProvider) => `http://localhost/api/auth/oauth/${provider}`,
  ),
  getOAuthLinkUrl: vi.fn(
    (provider: OAuthProvider) => `http://localhost/api/auth/oauth/${provider}/link`,
  ),
  ...overrides,
});

const defaultClientConfig: ApiClientConfig = {
  baseUrl: 'http://localhost:3001',
  getToken: () => 'test-token',
};

// ============================================================================
// Query Keys Tests
// ============================================================================

describe('oauthQueryKeys', () => {
  it('should generate correct query key structure', () => {
    expect(oauthQueryKeys.all).toEqual(['oauth']);
    expect(oauthQueryKeys.enabledProviders()).toEqual(['oauth', 'enabled-providers']);
    expect(oauthQueryKeys.connections()).toEqual(['oauth', 'connections']);
  });

  it('should maintain referential stability for base key', () => {
    const key1 = oauthQueryKeys.all;
    const key2 = oauthQueryKeys.all;
    expect(key1).toBe(key2);
  });

  it('should generate new arrays for function keys', () => {
    const key1 = oauthQueryKeys.enabledProviders();
    const key2 = oauthQueryKeys.enabledProviders();
    expect(key1).toEqual(key2);
    expect(key1).not.toBe(key2);
  });
});

// ============================================================================
// useEnabledOAuthProviders Tests
// ============================================================================

describe('useEnabledOAuthProviders', () => {
  let mockClient: ApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockApiClient();
    mockCreateApiClient.mockReturnValue(mockClient);
  });

  describe('initialization', () => {
    it('should start in loading state', () => {
      const { result } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.providers).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should create API client with provided config', () => {
      renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      expect(mockCreateApiClient).toHaveBeenCalledWith(defaultClientConfig);
      expect(mockCreateApiClient).toHaveBeenCalledTimes(1);
    });

    it('should recreate client when config changes', () => {
      const config1 = { baseUrl: 'http://localhost:3001' };
      const config2 = { baseUrl: 'http://localhost:3002' };

      const { rerender } = renderHook(({ config }) => useEnabledOAuthProviders(config), {
        initialProps: { config: config1 },
      });

      expect(mockCreateApiClient).toHaveBeenCalledWith(config1);

      rerender({ config: config2 });

      expect(mockCreateApiClient).toHaveBeenCalledWith(config2);
      expect(mockCreateApiClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetching providers on mount', () => {
    it('should fetch providers automatically on mount', async () => {
      const mockGetEnabledProviders = vi.fn().mockResolvedValue({
        providers: ['google', 'github'] as OAuthProvider[],
      });

      mockClient = createMockApiClient({
        getEnabledOAuthProviders: mockGetEnabledProviders,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetEnabledProviders).toHaveBeenCalledTimes(1);
      expect(result.current.providers).toEqual(['google', 'github']);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty providers list', async () => {
      const mockGetEnabledProviders = vi.fn().mockResolvedValue({
        providers: [],
      });

      mockClient = createMockApiClient({
        getEnabledOAuthProviders: mockGetEnabledProviders,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.providers).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle all supported providers', async () => {
      const allProviders: OAuthProvider[] = ['google', 'github', 'apple'];
      const mockGetEnabledProviders = vi.fn().mockResolvedValue({
        providers: allProviders,
      });

      mockClient = createMockApiClient({
        getEnabledOAuthProviders: mockGetEnabledProviders,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.providers).toEqual(allProviders);
    });
  });

  describe('error handling', () => {
    it('should handle API errors with Error instance', async () => {
      const testError = new Error('Network error');
      const mockGetEnabledProviders = vi.fn().mockRejectedValue(testError);

      mockClient = createMockApiClient({
        getEnabledOAuthProviders: mockGetEnabledProviders,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.providers).toEqual([]);
    });

    it('should convert non-Error rejections to Error', async () => {
      const mockGetEnabledProviders = vi.fn().mockRejectedValue('String error');

      mockClient = createMockApiClient({
        getEnabledOAuthProviders: mockGetEnabledProviders,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch enabled providers');
    });

    it('should clear previous error on successful refetch', async () => {
      const mockGetEnabledProviders = vi
        .fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ providers: ['google'] as OAuthProvider[] });

      mockClient = createMockApiClient({
        getEnabledOAuthProviders: mockGetEnabledProviders,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
      });

      expect(result.current.error?.message).toBe('First error');

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.providers).toEqual(['google']);
    });
  });

  describe('refresh functionality', () => {
    it('should expose refresh function', () => {
      const { result } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      expect(result.current.refresh).toBeInstanceOf(Function);
    });

    it('should refetch providers when refresh is called', async () => {
      const mockGetEnabledProviders = vi
        .fn()
        .mockResolvedValueOnce({ providers: ['google'] as OAuthProvider[] })
        .mockResolvedValueOnce({ providers: ['google', 'github'] as OAuthProvider[] });

      mockClient = createMockApiClient({
        getEnabledOAuthProviders: mockGetEnabledProviders,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.providers).toEqual(['google']);
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.providers).toEqual(['google', 'github']);
      });

      expect(mockGetEnabledProviders).toHaveBeenCalledTimes(2);
    });

    it('should complete refresh and return to non-loading state', async () => {
      const mockGetEnabledProviders = vi.fn().mockResolvedValue({
        providers: ['google'] as OAuthProvider[],
      });

      mockClient = createMockApiClient({
        getEnabledOAuthProviders: mockGetEnabledProviders,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refresh();
      });

      // After refresh completes, should be in non-loading state
      expect(result.current.isLoading).toBe(false);
      expect(mockGetEnabledProviders).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup and stability', () => {
    it('should not cause memory leaks on unmount', async () => {
      const mockGetEnabledProviders = vi.fn().mockResolvedValue({
        providers: ['google'] as OAuthProvider[],
      });

      mockClient = createMockApiClient({
        getEnabledOAuthProviders: mockGetEnabledProviders,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { unmount } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      await waitFor(() => {
        expect(mockGetEnabledProviders).toHaveBeenCalled();
      });

      unmount();

      // No errors should be thrown
      expect(mockGetEnabledProviders).toHaveBeenCalledTimes(1);
    });

    it('should maintain referential stability for refresh function', async () => {
      const mockGetEnabledProviders = vi.fn().mockResolvedValue({
        providers: ['google'] as OAuthProvider[],
      });

      mockClient = createMockApiClient({
        getEnabledOAuthProviders: mockGetEnabledProviders,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result, rerender } = renderHook(() => useEnabledOAuthProviders(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const refreshFn1 = result.current.refresh;

      rerender();

      const refreshFn2 = result.current.refresh;

      expect(refreshFn1).toBe(refreshFn2);
    });
  });
});

// ============================================================================
// useOAuthConnections Tests
// ============================================================================

describe('useOAuthConnections', () => {
  let mockClient: ApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockApiClient();
    mockCreateApiClient.mockReturnValue(mockClient);
  });

  describe('initialization', () => {
    it('should start in loading state', () => {
      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isActing).toBe(false);
      expect(result.current.connections).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should create API client with provided config', () => {
      renderHook(() => useOAuthConnections(defaultClientConfig));

      expect(mockCreateApiClient).toHaveBeenCalledWith(defaultClientConfig);
      expect(mockCreateApiClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetching connections on mount', () => {
    it('should fetch connections automatically on mount', async () => {
      const mockConnections = [
        createMockOAuthConnection({ provider: 'google' }),
        createMockOAuthConnection({
          provider: 'github',
          id: '123e4567-e89b-12d3-a456-426614174001',
        }),
      ];

      const mockGetConnections = vi.fn().mockResolvedValue({
        connections: mockConnections,
      });

      mockClient = createMockApiClient({
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetConnections).toHaveBeenCalledTimes(1);
      expect(result.current.connections).toEqual(mockConnections);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty connections list', async () => {
      const mockGetConnections = vi.fn().mockResolvedValue({
        connections: [],
      });

      mockClient = createMockApiClient({
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.connections).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle connections with null providerEmail', async () => {
      const mockConnection = createMockOAuthConnection({ providerEmail: null });

      const mockGetConnections = vi.fn().mockResolvedValue({
        connections: [mockConnection],
      });

      mockClient = createMockApiClient({
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.connections[0]?.providerEmail).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      const testError = new Error('Unauthorized');
      const mockGetConnections = vi.fn().mockRejectedValue(testError);

      mockClient = createMockApiClient({
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.connections).toEqual([]);
    });

    it('should convert non-Error rejections to Error', async () => {
      const mockGetConnections = vi.fn().mockRejectedValue('String error');

      mockClient = createMockApiClient({
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch connections');
    });
  });

  describe('unlink functionality', () => {
    it('should expose unlink function', () => {
      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      expect(result.current.unlink).toBeInstanceOf(Function);
    });

    it('should successfully unlink a provider', async () => {
      const mockConnections = [
        createMockOAuthConnection({ provider: 'google' }),
        createMockOAuthConnection({
          provider: 'github',
          id: '123e4567-e89b-12d3-a456-426614174001',
        }),
      ];

      const mockGetConnections = vi
        .fn()
        .mockResolvedValueOnce({ connections: mockConnections })
        .mockResolvedValueOnce({ connections: [mockConnections[1]] });

      const mockUnlink = vi.fn().mockResolvedValue({ message: 'Unlinked' });

      mockClient = createMockApiClient({
        getOAuthConnections: mockGetConnections,
        unlinkOAuthProvider: mockUnlink,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.connections).toHaveLength(2);
      });

      await act(async () => {
        await result.current.unlink('google');
      });

      expect(mockUnlink).toHaveBeenCalledWith('google');
      expect(mockGetConnections).toHaveBeenCalledTimes(2);

      await waitFor(() => {
        expect(result.current.connections).toHaveLength(1);
      });

      expect(result.current.connections[0]?.provider).toBe('github');
    });

    it('should complete unlink and return to non-acting state', async () => {
      const mockUnlink = vi.fn().mockResolvedValue({ message: 'Unlinked' });
      const mockGetConnections = vi.fn().mockResolvedValue({ connections: [] });

      mockClient = createMockApiClient({
        unlinkOAuthProvider: mockUnlink,
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isActing).toBe(false);

      await act(async () => {
        await result.current.unlink('google');
      });

      // After unlink completes, should be in non-acting state
      expect(result.current.isActing).toBe(false);
      expect(mockUnlink).toHaveBeenCalledWith('google');
    });

    it('should handle unlink errors and rethrow', async () => {
      const testError = new Error('Cannot unlink last provider');
      const mockUnlink = vi.fn().mockRejectedValue(testError);
      const mockGetConnections = vi.fn().mockResolvedValue({ connections: [] });

      mockClient = createMockApiClient({
        unlinkOAuthProvider: mockUnlink,
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.unlink('google')).rejects.toThrow(
          'Cannot unlink last provider',
        );
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.isActing).toBe(false);
    });

    it('should convert non-Error unlink failures to Error', async () => {
      const mockUnlink = vi.fn().mockRejectedValue('String error');
      const mockGetConnections = vi.fn().mockResolvedValue({ connections: [] });

      mockClient = createMockApiClient({
        unlinkOAuthProvider: mockUnlink,
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.unlink('github')).rejects.toThrow('Failed to unlink provider');
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to unlink provider');
    });

    it('should clear error on successful unlink after previous error', async () => {
      const mockUnlink = vi
        .fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ message: 'Unlinked' });

      const mockGetConnections = vi.fn().mockResolvedValue({ connections: [] });

      mockClient = createMockApiClient({
        unlinkOAuthProvider: mockUnlink,
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.unlink('google')).rejects.toThrow('First error');
      });

      expect(result.current.error).toBeInstanceOf(Error);

      await act(async () => {
        await result.current.unlink('github');
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('getLinkUrl functionality', () => {
    it('should expose getLinkUrl function', () => {
      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      expect(result.current.getLinkUrl).toBeInstanceOf(Function);
    });

    it('should return correct link URL for provider', async () => {
      const mockGetLinkUrl = vi.fn(
        (provider: OAuthProvider) => `http://localhost:3001/api/auth/oauth/${provider}/link`,
      );

      mockClient = createMockApiClient({
        getOAuthLinkUrl: mockGetLinkUrl,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const googleUrl = result.current.getLinkUrl('google');
      expect(googleUrl).toBe('http://localhost:3001/api/auth/oauth/google/link');
      expect(mockGetLinkUrl).toHaveBeenCalledWith('google');

      const githubUrl = result.current.getLinkUrl('github');
      expect(githubUrl).toBe('http://localhost:3001/api/auth/oauth/github/link');
      expect(mockGetLinkUrl).toHaveBeenCalledWith('github');
    });

    it('should support all OAuth providers', async () => {
      const mockGetLinkUrl = vi.fn(
        (provider: OAuthProvider) => `http://localhost:3001/api/auth/oauth/${provider}/link`,
      );

      mockClient = createMockApiClient({
        getOAuthLinkUrl: mockGetLinkUrl,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const providers: OAuthProvider[] = ['google', 'github', 'apple'];

      providers.forEach((provider) => {
        const url = result.current.getLinkUrl(provider);
        expect(url).toContain(provider);
        expect(mockGetLinkUrl).toHaveBeenCalledWith(provider);
      });
    });
  });

  describe('refresh functionality', () => {
    it('should expose refresh function', () => {
      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      expect(result.current.refresh).toBeInstanceOf(Function);
    });

    it('should refetch connections when refresh is called', async () => {
      const connection1 = createMockOAuthConnection({ provider: 'google' });
      const connection2 = createMockOAuthConnection({
        provider: 'github',
        id: '123e4567-e89b-12d3-a456-426614174001',
      });

      const mockGetConnections = vi
        .fn()
        .mockResolvedValueOnce({ connections: [connection1] })
        .mockResolvedValueOnce({ connections: [connection1, connection2] });

      mockClient = createMockApiClient({
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.connections).toHaveLength(1);
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.connections).toHaveLength(2);
      });

      expect(mockGetConnections).toHaveBeenCalledTimes(2);
    });

    it('should complete refresh and return to non-loading state', async () => {
      const mockGetConnections = vi.fn().mockResolvedValue({
        connections: [],
      });

      mockClient = createMockApiClient({
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refresh();
      });

      // After refresh completes, should be in non-loading state
      expect(result.current.isLoading).toBe(false);
      expect(mockGetConnections).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup and stability', () => {
    it('should not cause memory leaks on unmount', async () => {
      const mockGetConnections = vi.fn().mockResolvedValue({
        connections: [],
      });

      mockClient = createMockApiClient({
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { unmount } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(mockGetConnections).toHaveBeenCalled();
      });

      unmount();

      // No errors should be thrown
      expect(mockGetConnections).toHaveBeenCalledTimes(1);
    });

    it('should maintain referential stability for action functions', async () => {
      const mockGetConnections = vi.fn().mockResolvedValue({
        connections: [],
      });

      mockClient = createMockApiClient({
        getOAuthConnections: mockGetConnections,
      });
      mockCreateApiClient.mockReturnValue(mockClient);

      const { result, rerender } = renderHook(() => useOAuthConnections(defaultClientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const unlink1 = result.current.unlink;
      const getLinkUrl1 = result.current.getLinkUrl;
      const refresh1 = result.current.refresh;

      rerender();

      const unlink2 = result.current.unlink;
      const getLinkUrl2 = result.current.getLinkUrl;
      const refresh2 = result.current.refresh;

      expect(unlink1).toBe(unlink2);
      expect(getLinkUrl1).toBe(getLinkUrl2);
      expect(refresh1).toBe(refresh2);
    });
  });
});

// ============================================================================
// getOAuthLoginUrl Tests
// ============================================================================

describe('getOAuthLoginUrl', () => {
  describe('URL generation', () => {
    it('should generate correct OAuth login URL', () => {
      const url = getOAuthLoginUrl('http://localhost:3001', 'google');
      expect(url).toBe('http://localhost:3001/api/auth/oauth/google');
    });

    it('should handle baseUrl with trailing slash', () => {
      const url = getOAuthLoginUrl('http://localhost:3001/', 'github');
      expect(url).toBe('http://localhost:3001/api/auth/oauth/github');
    });

    it('should handle baseUrl with multiple trailing slashes', () => {
      const url = getOAuthLoginUrl('http://localhost:3001///', 'apple');
      expect(url).toBe('http://localhost:3001/api/auth/oauth/apple');
    });

    it('should work with different base URLs', () => {
      const urls = [
        getOAuthLoginUrl('https://api.example.com', 'google'),
        getOAuthLoginUrl('http://localhost:8080', 'github'),
        getOAuthLoginUrl('https://example.com/v1', 'apple'),
      ];

      expect(urls).toEqual([
        'https://api.example.com/api/auth/oauth/google',
        'http://localhost:8080/api/auth/oauth/github',
        'https://example.com/v1/api/auth/oauth/apple',
      ]);
    });

    it('should support all OAuth providers', () => {
      const providers: OAuthProvider[] = ['google', 'github', 'apple'];
      const baseUrl = 'http://localhost:3001';

      providers.forEach((provider) => {
        const url = getOAuthLoginUrl(baseUrl, provider);
        expect(url).toBe(`${baseUrl}/api/auth/oauth/${provider}`);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle baseUrl without protocol', () => {
      const url = getOAuthLoginUrl('localhost:3001', 'google');
      expect(url).toBe('localhost:3001/api/auth/oauth/google');
    });

    it('should handle empty string baseUrl', () => {
      const url = getOAuthLoginUrl('', 'github');
      expect(url).toBe('/api/auth/oauth/github');
    });

    it('should preserve baseUrl path segments', () => {
      const url = getOAuthLoginUrl('http://localhost:3001/app/v2', 'apple');
      expect(url).toBe('http://localhost:3001/app/v2/api/auth/oauth/apple');
    });
  });
});
