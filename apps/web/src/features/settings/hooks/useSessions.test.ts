// apps/web/src/features/settings/hooks/useSessions.test.ts
/**
 * Tests for useSessions, useRevokeSession, and useRevokeAllSessions hooks.
 *
 * Tests session management functionality with proper mocking
 * of the settings API and query cache invalidation.
 */


import { QueryCache, QueryCacheProvider } from '@abe-stack/sdk';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { createSettingsApi } from '../api';

import { useRevokeAllSessions, useRevokeSession, useSessions } from './useSessions';


import type { Session, SessionsListResponse } from '../api';
import type { ReactNode } from 'react';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../api', () => ({
  createSettingsApi: vi.fn(),
}));

// ============================================================================
// Test Setup
// ============================================================================

const mockListSessions = vi.fn();
const mockRevokeSession = vi.fn();
const mockRevokeAllSessions = vi.fn();

const createWrapper = (
  cache: QueryCache,
): ((props: { children: ReactNode }) => React.ReactElement) => {
  return ({ children }: { children: ReactNode }): React.ReactElement => {
    return React.createElement(QueryCacheProvider, { cache }, children);
  };
};

const mockSessions: Session[] = [
  {
    id: 'session-1',
    expiresAt: '2024-12-31T23:59:59Z',
    createdAt: '2024-01-01T00:00:00Z',
    lastUsedAt: '2024-01-15T12:00:00Z',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    isCurrent: true,
  },
  {
    id: 'session-2',
    expiresAt: '2024-12-31T23:59:59Z',
    createdAt: '2024-01-02T00:00:00Z',
    lastUsedAt: '2024-01-10T12:00:00Z',
    ipAddress: '192.168.1.2',
    userAgent: 'Chrome/120.0',
    isCurrent: false,
  },
];

describe('useSessions', () => {
  let queryCache: QueryCache;

  beforeEach(() => {
    vi.clearAllMocks();
    queryCache = new QueryCache();

    (createSettingsApi as Mock).mockReturnValue({
      listSessions: mockListSessions,
      revokeSession: mockRevokeSession,
      revokeAllSessions: mockRevokeAllSessions,
    });

    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return loading state initially', () => {
      mockListSessions.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(queryCache),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.sessions).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should provide refetch function', () => {
      mockListSessions.mockResolvedValue({ sessions: [] });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(queryCache),
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('successful session fetch', () => {
    it('should fetch and return sessions', async () => {
      const response: SessionsListResponse = {
        sessions: mockSessions,
      };

      mockListSessions.mockResolvedValue(response);

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(queryCache),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.sessions).toEqual(mockSessions);
      expect(mockListSessions).toHaveBeenCalled();
    });

    it('should handle empty sessions list', async () => {
      const response: SessionsListResponse = {
        sessions: [],
      };

      mockListSessions.mockResolvedValue(response);

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(queryCache),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toEqual([]);
      expect(result.current.isError).toBe(false);
    });

    it('should refetch sessions when refetch is called', async () => {
      const response: SessionsListResponse = {
        sessions: mockSessions,
      };

      mockListSessions.mockResolvedValue(response);

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(queryCache),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockListSessions).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockListSessions).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      const mockError = new Error('Failed to fetch sessions');

      mockListSessions.mockRejectedValue(mockError);

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(queryCache),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.sessions).toEqual([]);
      expect(result.current.error).toEqual(mockError);
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network error');

      mockListSessions.mockRejectedValue(mockError);

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(queryCache),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });
});

describe('useRevokeSession', () => {
  let queryCache: QueryCache;

  beforeEach(() => {
    vi.clearAllMocks();
    queryCache = new QueryCache();

    (createSettingsApi as Mock).mockReturnValue({
      listSessions: mockListSessions,
      revokeSession: mockRevokeSession,
      revokeAllSessions: mockRevokeAllSessions,
    });

    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return idle state initially', () => {
      const { result } = renderHook(() => useRevokeSession(), {
        wrapper: createWrapper(queryCache),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide revokeSession function', () => {
      const { result } = renderHook(() => useRevokeSession(), {
        wrapper: createWrapper(queryCache),
      });

      expect(typeof result.current.revokeSession).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('successful session revocation', () => {
    it('should revoke session successfully', async () => {
      const sessionId = 'session-1';
      const mockResponse = { success: true };

      mockRevokeSession.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRevokeSession(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeSession(sessionId);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(mockRevokeSession).toHaveBeenCalledWith(sessionId);
    });

    it('should invalidate sessions cache on success', async () => {
      const sessionId = 'session-1';
      const mockResponse = { success: true };

      mockRevokeSession.mockResolvedValue(mockResponse);

      const invalidateSpy = vi.spyOn(queryCache, 'invalidateQuery');

      const { result } = renderHook(() => useRevokeSession(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeSession(sessionId);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(['sessions']);
    });

    it('should call onSuccess callback', async () => {
      const sessionId = 'session-1';
      const mockResponse = { success: true };
      const onSuccess = vi.fn();

      mockRevokeSession.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRevokeSession({ onSuccess }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeSession(sessionId);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should handle revocation errors', async () => {
      const sessionId = 'session-1';
      const mockError = new Error('Failed to revoke session');

      mockRevokeSession.mockRejectedValue(mockError);

      const { result } = renderHook(() => useRevokeSession(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeSession(sessionId);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });

    it('should handle session not found error', async () => {
      const sessionId = 'non-existent';
      const mockError = new Error('Session not found');

      mockRevokeSession.mockRejectedValue(mockError);

      const { result } = renderHook(() => useRevokeSession(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeSession(sessionId);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('should call onError callback', async () => {
      const sessionId = 'session-1';
      const mockError = new Error('Revocation failed');
      const onError = vi.fn();

      mockRevokeSession.mockRejectedValue(mockError);

      const { result } = renderHook(() => useRevokeSession({ onError }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeSession(sessionId);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('should not invalidate cache on error', async () => {
      const sessionId = 'session-1';
      const mockError = new Error('Failed');

      mockRevokeSession.mockRejectedValue(mockError);

      const invalidateSpy = vi.spyOn(queryCache, 'invalidateQuery');

      const { result } = renderHook(() => useRevokeSession(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeSession(sessionId);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    it('should reset state to idle', async () => {
      const sessionId = 'session-1';
      const mockResponse = { success: true };

      mockRevokeSession.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRevokeSession(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeSession(sessionId);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});

describe('useRevokeAllSessions', () => {
  let queryCache: QueryCache;

  beforeEach(() => {
    vi.clearAllMocks();
    queryCache = new QueryCache();

    (createSettingsApi as Mock).mockReturnValue({
      listSessions: mockListSessions,
      revokeSession: mockRevokeSession,
      revokeAllSessions: mockRevokeAllSessions,
    });

    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return idle state initially', () => {
      const { result } = renderHook(() => useRevokeAllSessions(), {
        wrapper: createWrapper(queryCache),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.revokedCount).toBeNull();
    });

    it('should provide revokeAllSessions function', () => {
      const { result } = renderHook(() => useRevokeAllSessions(), {
        wrapper: createWrapper(queryCache),
      });

      expect(typeof result.current.revokeAllSessions).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('successful revocation', () => {
    it('should revoke all sessions successfully', async () => {
      const mockResponse = { revokedCount: 3, success: true };

      mockRevokeAllSessions.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRevokeAllSessions(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeAllSessions();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.revokedCount).toBe(3);
      expect(mockRevokeAllSessions).toHaveBeenCalled();
    });

    it('should handle zero revoked sessions', async () => {
      const mockResponse = { revokedCount: 0, success: true };

      mockRevokeAllSessions.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRevokeAllSessions(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeAllSessions();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.revokedCount).toBe(0);
    });

    it('should invalidate sessions cache on success', async () => {
      const mockResponse = { revokedCount: 2, success: true };

      mockRevokeAllSessions.mockResolvedValue(mockResponse);

      const invalidateSpy = vi.spyOn(queryCache, 'invalidateQuery');

      const { result } = renderHook(() => useRevokeAllSessions(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeAllSessions();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(['sessions']);
    });

    it('should call onSuccess callback with response', async () => {
      const mockResponse = { revokedCount: 5, success: true };
      const onSuccess = vi.fn();

      mockRevokeAllSessions.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRevokeAllSessions({ onSuccess }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeAllSessions();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should handle revocation errors', async () => {
      const mockError = new Error('Failed to revoke all sessions');

      mockRevokeAllSessions.mockRejectedValue(mockError);

      const { result } = renderHook(() => useRevokeAllSessions(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeAllSessions();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toEqual(mockError);
      expect(result.current.revokedCount).toBeNull();
    });

    it('should call onError callback', async () => {
      const mockError = new Error('Revocation failed');
      const onError = vi.fn();

      mockRevokeAllSessions.mockRejectedValue(mockError);

      const { result } = renderHook(() => useRevokeAllSessions({ onError }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeAllSessions();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('should not invalidate cache on error', async () => {
      const mockError = new Error('Failed');

      mockRevokeAllSessions.mockRejectedValue(mockError);

      const invalidateSpy = vi.spyOn(queryCache, 'invalidateQuery');

      const { result } = renderHook(() => useRevokeAllSessions(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeAllSessions();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    it('should reset state to idle', async () => {
      const mockResponse = { revokedCount: 3, success: true };

      mockRevokeAllSessions.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRevokeAllSessions(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.revokeAllSessions();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.revokedCount).toBeNull();
    });
  });
});
