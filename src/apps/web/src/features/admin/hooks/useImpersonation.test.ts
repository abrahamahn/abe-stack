// src/apps/web/src/features/admin/hooks/useImpersonation.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useImpersonation } from './useImpersonation';

// Mock the useAuth hook
vi.mock('@auth/hooks', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
    refreshToken: vi.fn().mockResolvedValue(true),
  })),
}));

describe('useImpersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/impersonate/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
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
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/impersonate/user-123', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  it('should throw error if endImpersonation fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useImpersonation());

    await expect(result.current.endImpersonation()).rejects.toThrow(
      'Failed to end impersonation',
    );
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
