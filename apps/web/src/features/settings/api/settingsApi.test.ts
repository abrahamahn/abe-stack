// apps/web/src/features/settings/api/settingsApi.test.ts
/**
 * Settings API Client Tests
 *
 * Comprehensive unit tests for the settings API client, covering:
 * - Profile update operations
 * - Password change operations
 * - Avatar upload/delete operations
 * - Session management operations
 * - Error handling and network failures
 * - Authentication header handling
 */

import { NetworkError } from '@abe-stack/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createSettingsApi } from './settingsApi';

import type { SettingsApiConfig } from './settingsApi';
import type {
  AvatarDeleteResponse,
  AvatarUploadResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  RevokeAllSessionsResponse,
  RevokeSessionResponse,
  Session,
  SessionsListResponse,
  UpdateProfileRequest,
  User,
} from '@abe-stack/core';

describe('createSettingsApi', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let config: SettingsApiConfig;
  let mockToken: string | null;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockToken = 'test-token-123';
    config = {
      baseUrl: 'https://api.example.com',
      getToken: () => mockToken,
      fetchImpl: mockFetch as typeof fetch,
    };
  });

  // ============================================================================
  // Configuration & Setup
  // ============================================================================

  describe('configuration', () => {
    it('should create API client with provided config', () => {
      const api = createSettingsApi(config);
      expect(api).toBeDefined();
      expect(api.updateProfile).toBeInstanceOf(Function);
      expect(api.changePassword).toBeInstanceOf(Function);
      expect(api.uploadAvatar).toBeInstanceOf(Function);
      expect(api.deleteAvatar).toBeInstanceOf(Function);
      expect(api.listSessions).toBeInstanceOf(Function);
      expect(api.revokeSession).toBeInstanceOf(Function);
      expect(api.revokeAllSessions).toBeInstanceOf(Function);
    });

    it('should strip trailing slashes from baseUrl', async () => {
      config.baseUrl = 'https://api.example.com///';
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

      const api = createSettingsApi(config);
      await api.listSessions();

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toBe('https://api.example.com/api/users/me/sessions');
    });

    it('should use default fetch when fetchImpl not provided', async () => {
      const configWithoutFetch: SettingsApiConfig = {
        baseUrl: 'https://api.example.com',
        getToken: () => 'token',
      };

      const api = createSettingsApi(configWithoutFetch);
      expect(api).toBeDefined();
    });

    it('should handle missing getToken function', async () => {
      const configWithoutToken: SettingsApiConfig = {
        baseUrl: 'https://api.example.com',
        fetchImpl: mockFetch as typeof fetch,
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));

      const api = createSettingsApi(configWithoutToken);
      await api.listSessions();

      const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(headers.has('Authorization')).toBe(false);
    });
  });

  // ============================================================================
  // Profile Operations
  // ============================================================================

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const request: UpdateProfileRequest = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const mockUser: User = {
        id: 'user-123',
        email: 'john@example.com',
        name: 'John Doe',
        role: 'user',
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockUser), { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.updateProfile(request);

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/me/update',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(request),
          credentials: 'include',
        }),
      );
    });

    it('should include authorization header for profile update', async () => {
      const request: UpdateProfileRequest = { name: 'Jane Doe' };
      mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      const api = createSettingsApi(config);
      await api.updateProfile(request);

      const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token-123');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle profile update errors', async () => {
      const request: UpdateProfileRequest = { email: 'invalid' };
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'Invalid email', code: 'INVALID_EMAIL' }), {
          status: 400,
        }),
      );

      const api = createSettingsApi(config);
      await expect(api.updateProfile(request)).rejects.toThrow();
    });
  });

  // ============================================================================
  // Password Operations
  // ============================================================================

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const request: ChangePasswordRequest = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };

      const mockResponse: ChangePasswordResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.changePassword(request);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/me/password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
          credentials: 'include',
        }),
      );
    });

    it('should handle incorrect current password', async () => {
      const request: ChangePasswordRequest = {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      };

      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ message: 'Current password is incorrect', code: 'INVALID_PASSWORD' }),
          { status: 401 },
        ),
      );

      const api = createSettingsApi(config);
      await expect(api.changePassword(request)).rejects.toThrow();
    });

    it('should handle weak new password', async () => {
      const request: ChangePasswordRequest = {
        currentPassword: 'old-password',
        newPassword: '123',
      };

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'Password too weak', code: 'WEAK_PASSWORD' }), {
          status: 400,
        }),
      );

      const api = createSettingsApi(config);
      await expect(api.changePassword(request)).rejects.toThrow();
    });
  });

  // ============================================================================
  // Avatar Operations
  // ============================================================================

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const mockFile = new File(['avatar-content'], 'avatar.jpg', { type: 'image/jpeg' });

      const mockResponse: AvatarUploadResponse = {
        success: true,
        avatarUrl: 'https://cdn.example.com/avatars/user-123.jpg',
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.uploadAvatar(mockFile);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/me/avatar',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );

      // Verify FormData was used
      const body = mockFetch.mock.calls[0][1]?.body;
      expect(body).toBeInstanceOf(FormData);
    });

    it('should not set Content-Type header for FormData', async () => {
      const mockFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

      const api = createSettingsApi(config);
      await api.uploadAvatar(mockFile);

      const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
      // Content-Type should not be set (browser will add with boundary)
      expect(headers.has('Content-Type')).toBe(false);
    });

    it('should include authorization header for avatar upload', async () => {
      const mockFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

      const api = createSettingsApi(config);
      await api.uploadAvatar(mockFile);

      const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token-123');
    });

    it('should handle invalid file type', async () => {
      const mockFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'Invalid file type', code: 'INVALID_FILE_TYPE' }), {
          status: 400,
        }),
      );

      const api = createSettingsApi(config);
      await expect(api.uploadAvatar(mockFile)).rejects.toThrow();
    });

    it('should handle file too large', async () => {
      const mockFile = new File(['content'], 'large-avatar.jpg', { type: 'image/jpeg' });
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'File too large', code: 'FILE_TOO_LARGE' }), {
          status: 413,
        }),
      );

      const api = createSettingsApi(config);
      await expect(api.uploadAvatar(mockFile)).rejects.toThrow();
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar successfully', async () => {
      const mockResponse: AvatarDeleteResponse = {
        success: true,
        message: 'Avatar deleted successfully',
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.deleteAvatar();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/me/avatar/delete',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        }),
      );
    });

    it('should handle no avatar to delete', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'No avatar found', code: 'NOT_FOUND' }), {
          status: 404,
        }),
      );

      const api = createSettingsApi(config);
      await expect(api.deleteAvatar()).rejects.toThrow();
    });
  });

  // ============================================================================
  // Session Operations
  // ============================================================================

  describe('listSessions', () => {
    it('should list all sessions successfully', async () => {
      const mockSessions: Session[] = [
        {
          id: 'session-1',
          userId: 'user-123',
          device: 'Chrome on macOS',
          ipAddress: '192.168.1.1',
          createdAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          isCurrent: true,
        },
        {
          id: 'session-2',
          userId: 'user-123',
          device: 'Firefox on Windows',
          ipAddress: '192.168.1.2',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          lastActivityAt: new Date(Date.now() - 3600000).toISOString(),
          isCurrent: false,
        },
      ];

      const mockResponse: SessionsListResponse = {
        sessions: mockSessions,
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.listSessions();

      expect(result).toEqual(mockResponse);
      expect(result.sessions).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/me/sessions',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        }),
      );
    });

    it('should handle empty sessions list', async () => {
      const mockResponse: SessionsListResponse = {
        sessions: [],
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.listSessions();

      expect(result.sessions).toHaveLength(0);
    });

    it('should include authorization header for listing sessions', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));

      const api = createSettingsApi(config);
      await api.listSessions();

      const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token-123');
    });
  });

  describe('revokeSession', () => {
    it('should revoke specific session successfully', async () => {
      const sessionId = 'session-123';
      const mockResponse: RevokeSessionResponse = {
        success: true,
        message: 'Session revoked successfully',
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.revokeSession(sessionId);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/me/sessions/session-123',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        }),
      );
    });

    it('should handle revoking non-existent session', async () => {
      const sessionId = 'non-existent';
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'Session not found', code: 'NOT_FOUND' }), {
          status: 404,
        }),
      );

      const api = createSettingsApi(config);
      await expect(api.revokeSession(sessionId)).rejects.toThrow();
    });

    it('should handle revoking current session', async () => {
      const sessionId = 'current-session';
      const mockResponse: RevokeSessionResponse = {
        success: true,
        message: 'Current session revoked',
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.revokeSession(sessionId);

      expect(result.success).toBe(true);
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions successfully', async () => {
      const mockResponse: RevokeAllSessionsResponse = {
        success: true,
        revokedCount: 5,
        message: 'All sessions revoked successfully',
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.revokeAllSessions();

      expect(result).toEqual(mockResponse);
      expect(result.revokedCount).toBe(5);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users/me/sessions/revoke-all',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );
    });

    it('should handle revoking when no other sessions exist', async () => {
      const mockResponse: RevokeAllSessionsResponse = {
        success: true,
        revokedCount: 0,
        message: 'No other sessions to revoke',
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.revokeAllSessions();

      expect(result.revokedCount).toBe(0);
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('error handling', () => {
    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection failed'));

      const api = createSettingsApi(config);
      await expect(api.listSessions()).rejects.toThrow(NetworkError);
      await expect(api.listSessions()).rejects.toThrow('Failed to fetch GET /users/me/sessions');
    });

    it('should handle non-Error fetch rejections', async () => {
      mockFetch.mockRejectedValue('String error');

      const api = createSettingsApi(config);
      await expect(api.listSessions()).rejects.toThrow(NetworkError);
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue(new Response('invalid json', { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.listSessions();

      // Should return empty object when JSON parsing fails
      expect(result).toEqual({});
    });

    it('should handle 400 Bad Request', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'Bad request', code: 'BAD_REQUEST' }), {
          status: 400,
        }),
      );

      const api = createSettingsApi(config);
      await expect(api.listSessions()).rejects.toThrow();
    });

    it('should handle 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'Unauthorized', code: 'UNAUTHORIZED' }), {
          status: 401,
        }),
      );

      const api = createSettingsApi(config);
      await expect(api.listSessions()).rejects.toThrow();
    });

    it('should handle 403 Forbidden', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'Forbidden', code: 'FORBIDDEN' }), {
          status: 403,
        }),
      );

      const api = createSettingsApi(config);
      await expect(api.listSessions()).rejects.toThrow();
    });

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'Not found', code: 'NOT_FOUND' }), {
          status: 404,
        }),
      );

      const api = createSettingsApi(config);
      await expect(api.listSessions()).rejects.toThrow();
    });

    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: 'Server error', code: 'INTERNAL_ERROR' }), {
          status: 500,
        }),
      );

      const api = createSettingsApi(config);
      await expect(api.listSessions()).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Request timeout'));
            }, 100);
          }),
      );

      const api = createSettingsApi(config);
      await expect(api.listSessions()).rejects.toThrow(NetworkError);
    });
  });

  // ============================================================================
  // Authentication
  // ============================================================================

  describe('authentication', () => {
    it('should include Bearer token when token is available', async () => {
      mockToken = 'valid-token-456';
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));

      const api = createSettingsApi(config);
      await api.listSessions();

      const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer valid-token-456');
    });

    it('should not include Authorization header when token is null', async () => {
      mockToken = null;
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));

      const api = createSettingsApi(config);
      await api.listSessions();

      const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(headers.has('Authorization')).toBe(false);
    });

    it('should not include Authorization header when token is empty string', async () => {
      config.getToken = () => '';
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));

      const api = createSettingsApi(config);
      await api.listSessions();

      const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(headers.has('Authorization')).toBe(false);
    });

    it('should not include Authorization header when token is undefined', async () => {
      config.getToken = () => undefined;
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));

      const api = createSettingsApi(config);
      await api.listSessions();

      const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(headers.has('Authorization')).toBe(false);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValue(new Response('', { status: 200 }));

      const api = createSettingsApi(config);
      const result = await api.listSessions();

      expect(result).toEqual({});
    });

    it('should handle very large session lists', async () => {
      const largeSessions: Session[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `session-${i}`,
        userId: 'user-123',
        device: `Device ${i}`,
        ipAddress: `192.168.1.${i % 255}`,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        isCurrent: i === 0,
      }));

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ sessions: largeSessions }), { status: 200 }),
      );

      const api = createSettingsApi(config);
      const result = await api.listSessions();

      expect(result.sessions).toHaveLength(1000);
    });

    it('should handle special characters in session ID', async () => {
      const sessionId = 'session-with-special-chars-!@#$%';
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

      const api = createSettingsApi(config);
      await api.revokeSession(sessionId);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('session-with-special-chars-!@#$%'),
        expect.any(Object),
      );
    });

    it('should always include credentials: include', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));

      const api = createSettingsApi(config);
      await api.listSessions();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });

    it('should handle Content-Type correctly for JSON requests', async () => {
      const request: UpdateProfileRequest = { name: 'Test User' };
      mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      const api = createSettingsApi(config);
      await api.updateProfile(request);

      const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
    });
  });
});
