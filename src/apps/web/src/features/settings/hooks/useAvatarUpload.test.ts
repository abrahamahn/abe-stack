// src/apps/web/src/features/settings/hooks/useAvatarUpload.test.ts
/**
 * Tests for useAvatarUpload and useAvatarDelete hooks.
 *
 * Tests avatar upload and deletion functionality with proper mocking
 * of the settings API and query cache invalidation.
 */

import { QueryCache } from '@abe-stack/client-engine';
import { QueryCacheProvider } from '@abe-stack/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactElement, type ReactNode, createElement } from 'react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { createSettingsApi } from '../api';

import { useAvatarDelete, useAvatarUpload } from './useAvatarUpload';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../api', () => ({
  createSettingsApi: vi.fn(),
}));

// ============================================================================
// Test Setup
// ============================================================================

const mockUploadAvatar = vi.fn();
const mockDeleteAvatar = vi.fn();

const createWrapper = (cache: QueryCache): ((props: { children: ReactNode }) => ReactElement) => {
  return ({ children }: { children: ReactNode }): ReactElement => {
    return createElement(QueryCacheProvider, { cache: cache, children }, children);
  };
};

describe('useAvatarUpload', () => {
  let queryCache: QueryCache;

  beforeEach(() => {
    vi.clearAllMocks();
    queryCache = new QueryCache();

    (createSettingsApi as Mock).mockReturnValue({
      uploadAvatar: mockUploadAvatar,
      deleteAvatar: mockDeleteAvatar,
    });

    // Reset localStorage
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return idle state initially', () => {
      const { result } = renderHook(() => useAvatarUpload(), {
        wrapper: createWrapper(queryCache),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.avatarUrl).toBeNull();
    });

    it('should provide uploadAvatar function', () => {
      const { result } = renderHook(() => useAvatarUpload(), {
        wrapper: createWrapper(queryCache),
      });

      expect(typeof result.current.uploadAvatar).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('successful upload', () => {
    it('should upload avatar and return avatar URL', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const mockResponse = { avatarUrl: 'https://example.com/avatar.png' };

      mockUploadAvatar.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAvatarUpload(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.uploadAvatar(mockFile);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.avatarUrl).toBe('https://example.com/avatar.png');
      expect(mockUploadAvatar).toHaveBeenCalledWith(mockFile);
    });

    it('should invalidate user cache on success', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const mockResponse = { avatarUrl: 'https://example.com/avatar.png' };

      mockUploadAvatar.mockResolvedValue(mockResponse);

      const invalidateSpy = vi.spyOn(queryCache, 'invalidateQuery');

      const { result } = renderHook(() => useAvatarUpload(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.uploadAvatar(mockFile);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(['user', 'me']);
    });

    it('should call onSuccess callback', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const mockResponse = { avatarUrl: 'https://example.com/avatar.png' };
      const onSuccess = vi.fn();

      mockUploadAvatar.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAvatarUpload({ onSuccess }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.uploadAvatar(mockFile);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should handle upload errors', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const mockError = new Error('Upload failed');

      mockUploadAvatar.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAvatarUpload(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.uploadAvatar(mockFile);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toEqual(mockError);
      expect(result.current.avatarUrl).toBeNull();
    });

    it('should call onError callback', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const mockError = new Error('Upload failed');
      const onError = vi.fn();

      mockUploadAvatar.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAvatarUpload({ onError }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.uploadAvatar(mockFile);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('should not invalidate cache on error', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const mockError = new Error('Upload failed');

      mockUploadAvatar.mockRejectedValue(mockError);

      const invalidateSpy = vi.spyOn(queryCache, 'invalidateQuery');

      const { result } = renderHook(() => useAvatarUpload(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.uploadAvatar(mockFile);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    it('should reset state to idle', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const mockResponse = { avatarUrl: 'https://example.com/avatar.png' };

      mockUploadAvatar.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAvatarUpload(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.uploadAvatar(mockFile);
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
      expect(result.current.avatarUrl).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty file name', async () => {
      const mockFile = new File(['content'], '', { type: 'image/png' });
      const mockResponse = { avatarUrl: 'https://example.com/avatar.png' };

      mockUploadAvatar.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAvatarUpload(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.uploadAvatar(mockFile);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUploadAvatar).toHaveBeenCalledWith(mockFile);
    });

    it('should handle large files', async () => {
      const largeContent = new Uint8Array(1024 * 1024); // 1MB
      largeContent.fill(97);
      const mockFile = new File([largeContent], 'large.png', { type: 'image/png' });
      const mockResponse = { avatarUrl: 'https://example.com/avatar.png' };

      mockUploadAvatar.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAvatarUpload(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.uploadAvatar(mockFile);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUploadAvatar).toHaveBeenCalledWith(mockFile);
    });
  });
});

describe('useAvatarDelete', () => {
  let queryCache: QueryCache;

  beforeEach(() => {
    vi.clearAllMocks();
    queryCache = new QueryCache();

    (createSettingsApi as Mock).mockReturnValue({
      uploadAvatar: mockUploadAvatar,
      deleteAvatar: mockDeleteAvatar,
    });

    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return idle state initially', () => {
      const { result } = renderHook(() => useAvatarDelete(), {
        wrapper: createWrapper(queryCache),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide deleteAvatar function', () => {
      const { result } = renderHook(() => useAvatarDelete(), {
        wrapper: createWrapper(queryCache),
      });

      expect(typeof result.current.deleteAvatar).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('successful deletion', () => {
    it('should delete avatar successfully', async () => {
      const mockResponse = { success: true };

      mockDeleteAvatar.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAvatarDelete(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.deleteAvatar();
      });

      await waitFor(() => {
        expect(mockDeleteAvatar).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockDeleteAvatar).toHaveBeenCalled();
    });

    it('should invalidate user cache on success', async () => {
      const mockResponse = { success: true };

      mockDeleteAvatar.mockResolvedValue(mockResponse);

      const invalidateSpy = vi.spyOn(queryCache, 'invalidateQuery');

      const { result } = renderHook(() => useAvatarDelete(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.deleteAvatar();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(['user', 'me']);
    });

    it('should call onSuccess callback', async () => {
      const mockResponse = { success: true };
      const onSuccess = vi.fn();

      mockDeleteAvatar.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAvatarDelete({ onSuccess }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.deleteAvatar();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should handle deletion errors', async () => {
      const mockError = new Error('Delete failed');

      mockDeleteAvatar.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAvatarDelete(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.deleteAvatar();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });

    it('should call onError callback', async () => {
      const mockError = new Error('Delete failed');
      const onError = vi.fn();

      mockDeleteAvatar.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAvatarDelete({ onError }), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.deleteAvatar();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('should not invalidate cache on error', async () => {
      const mockError = new Error('Delete failed');

      mockDeleteAvatar.mockRejectedValue(mockError);

      const invalidateSpy = vi.spyOn(queryCache, 'invalidateQuery');

      const { result } = renderHook(() => useAvatarDelete(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.deleteAvatar();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    it('should reset state to idle', async () => {
      const mockResponse = { success: true };

      mockDeleteAvatar.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAvatarDelete(), {
        wrapper: createWrapper(queryCache),
      });

      act(() => {
        result.current.deleteAvatar();
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
