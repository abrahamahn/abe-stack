// main/apps/web/src/features/admin/hooks/useImpersonation.test.ts
import { clearApiClient } from '@abe-stack/api';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useImpersonation } from './useImpersonation';

// Mock the useAuth hook
vi.mock('@auth/hooks', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
    refreshToken: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({
    config: { apiUrl: 'http://localhost:3000' },
  }),
}));

describe('useImpersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearApiClient();
    global.fetch = vi.fn();
  });

  it('should return isImpersonating as false by default', () => {
    const { result } = renderHook(() => useImpersonation());

    expect(result.current.isImpersonating).toBe(false);
    expect(result.current.targetEmail).toBeNull();
  });

  it('should provide endImpersonation function', () => {
    const { result } = renderHook(() => useImpersonation());

    expect(result.current.endImpersonation).toBeInstanceOf(Function);
  });

  it('should provide startImpersonation function', () => {
    const { result } = renderHook(() => useImpersonation());

    expect(result.current.startImpersonation).toBeInstanceOf(Function);
  });

  it('should call POST /api/admin/impersonate/end when ending impersonation', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Impersonation ended' }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useImpersonation());

    await result.current.endImpersonation();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/admin/impersonate/end',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'user-1' }),
        }),
      );
    });
  });

  it('should call POST /api/admin/impersonate/:userId when starting impersonation', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'test-token' }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useImpersonation());

    await result.current.startImpersonation('user-123');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/admin/impersonate/user-123',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  it('should throw error if endImpersonation fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Failed to end impersonation session' }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useImpersonation());

    await expect(result.current.endImpersonation()).rejects.toThrow('Failed to end impersonation');
  });

  it('should throw error if startImpersonation fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ message: 'Cannot impersonate admin users' }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useImpersonation());

    await expect(result.current.startImpersonation('admin-123')).rejects.toThrow(
      'Cannot impersonate admin users',
    );
  });
});
