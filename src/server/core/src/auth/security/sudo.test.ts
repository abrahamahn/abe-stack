// src/server/core/src/auth/security/sudo.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock the sudo handlers module
vi.mock('../handlers/sudo', () => ({
  verifySudoToken: vi.fn(),
  SUDO_TOKEN_HEADER: 'x-sudo-token',
}));

// Import the mocked function
import { verifySudoToken } from '../handlers/sudo';

import { createRequireSudo } from './sudo';

import type { FastifyReply, FastifyRequest } from 'fastify';

describe('createRequireSudo', () => {
  const mockJwtSecret = 'test-jwt-secret';
  let mockSend: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockReply: FastifyReply;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock reply
    mockSend = vi.fn().mockResolvedValue(undefined);
    mockStatus = vi.fn().mockReturnValue({ send: mockSend });
    mockReply = { status: mockStatus } as unknown as FastifyReply;
  });

  describe('when no token header is present', () => {
    test('should return 403 with SUDO_REQUIRED', () => {
      const mockRequest = {
        headers: {},
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest;

      const requireSudo = createRequireSudo(mockJwtSecret);
      requireSudo(mockRequest, mockReply);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockSend).toHaveBeenCalledWith({
        message: 'Sudo authentication required. Please re-verify your identity.',
        code: 'SUDO_REQUIRED',
      });
    });
  });

  describe('when token header is empty string', () => {
    test('should return 403 with SUDO_REQUIRED', () => {
      const mockRequest = {
        headers: { 'x-sudo-token': '' },
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest;

      const requireSudo = createRequireSudo(mockJwtSecret);
      requireSudo(mockRequest, mockReply);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockSend).toHaveBeenCalledWith({
        message: 'Sudo authentication required. Please re-verify your identity.',
        code: 'SUDO_REQUIRED',
      });
    });
  });

  describe('when token header is not a string', () => {
    test('should return 403 with SUDO_REQUIRED for array value', () => {
      const mockRequest = {
        headers: { 'x-sudo-token': ['token-1', 'token-2'] },
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest;

      const requireSudo = createRequireSudo(mockJwtSecret);
      requireSudo(mockRequest, mockReply);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockSend).toHaveBeenCalledWith({
        message: 'Sudo authentication required. Please re-verify your identity.',
        code: 'SUDO_REQUIRED',
      });
    });
  });

  describe('when verifySudoToken returns null', () => {
    test('should return 403 with SUDO_EXPIRED', () => {
      const mockRequest = {
        headers: { 'x-sudo-token': 'invalid-token' },
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest;

      vi.mocked(verifySudoToken).mockReturnValue(null);

      const requireSudo = createRequireSudo(mockJwtSecret);
      requireSudo(mockRequest, mockReply);

      expect(verifySudoToken).toHaveBeenCalledWith('invalid-token', mockJwtSecret);
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockSend).toHaveBeenCalledWith({
        message: 'Sudo token is invalid or expired. Please re-verify your identity.',
        code: 'SUDO_EXPIRED',
      });
    });
  });

  describe('when token userId does not match request userId', () => {
    test('should return 403 with SUDO_MISMATCH', () => {
      const mockRequest = {
        headers: { 'x-sudo-token': 'valid-token' },
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest;

      vi.mocked(verifySudoToken).mockReturnValue({ userId: 'user-2' });

      const requireSudo = createRequireSudo(mockJwtSecret);
      requireSudo(mockRequest, mockReply);

      expect(verifySudoToken).toHaveBeenCalledWith('valid-token', mockJwtSecret);
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockSend).toHaveBeenCalledWith({
        message: 'Sudo token does not match authenticated user.',
        code: 'SUDO_MISMATCH',
      });
    });
  });

  describe('when token is valid and userId matches', () => {
    test('should pass without calling reply.status', () => {
      const mockRequest = {
        headers: { 'x-sudo-token': 'valid-token' },
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest;

      vi.mocked(verifySudoToken).mockReturnValue({ userId: 'user-1' });

      const requireSudo = createRequireSudo(mockJwtSecret);
      requireSudo(mockRequest, mockReply);

      expect(verifySudoToken).toHaveBeenCalledWith('valid-token', mockJwtSecret);
      expect(mockStatus).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('when no request.user exists', () => {
    test('should pass without calling reply.status', () => {
      const mockRequest = {
        headers: { 'x-sudo-token': 'valid-token' },
      } as unknown as FastifyRequest;

      vi.mocked(verifySudoToken).mockReturnValue({ userId: 'user-1' });

      const requireSudo = createRequireSudo(mockJwtSecret);
      requireSudo(mockRequest, mockReply);

      expect(verifySudoToken).toHaveBeenCalledWith('valid-token', mockJwtSecret);
      expect(mockStatus).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('when request.user.userId is undefined', () => {
    test('should pass without calling reply.status', () => {
      const mockRequest = {
        headers: { 'x-sudo-token': 'valid-token' },
        user: {},
      } as unknown as FastifyRequest;

      vi.mocked(verifySudoToken).mockReturnValue({ userId: 'user-1' });

      const requireSudo = createRequireSudo(mockJwtSecret);
      requireSudo(mockRequest, mockReply);

      expect(verifySudoToken).toHaveBeenCalledWith('valid-token', mockJwtSecret);
      expect(mockStatus).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle whitespace-only token as valid string', () => {
      const mockRequest = {
        headers: { 'x-sudo-token': '   ' },
        user: { userId: 'user-1' },
      } as unknown as FastifyRequest;

      vi.mocked(verifySudoToken).mockReturnValue(null);

      const requireSudo = createRequireSudo(mockJwtSecret);
      requireSudo(mockRequest, mockReply);

      // Whitespace-only string is not empty, so it passes the initial check
      // and gets verified (which returns null)
      expect(verifySudoToken).toHaveBeenCalledWith('   ', mockJwtSecret);
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockSend).toHaveBeenCalledWith({
        message: 'Sudo token is invalid or expired. Please re-verify your identity.',
        code: 'SUDO_EXPIRED',
      });
    });
  });
});
