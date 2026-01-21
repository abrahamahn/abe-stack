// apps/server/src/modules/auth/handlers/__tests__/register.test.ts
import { EmailAlreadyExistsError, EmailSendError, WeakPasswordError } from '@abe-stack/core';
import { registerUser } from '@auth/service';
import { mapErrorToResponse } from '@shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleRegister } from '../register';

// Mock auth service (vi.mock is hoisted automatically)
vi.mock('@auth/service', () => ({
  registerUser: vi.fn(),
}));

// Mock @shared module while preserving real error classes
vi.mock('@shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('@shared')>();
  return {
    ...original,
    mapErrorToResponse: vi.fn((error: unknown, _ctx: unknown) => {
      if (error instanceof EmailAlreadyExistsError) {
        return { status: 409, body: { message: (error as Error).message, code: 'EMAIL_EXISTS' } };
      }
      if (error instanceof WeakPasswordError) {
        return {
          status: 400,
          body: { message: 'Password does not meet requirements', code: 'WEAK_PASSWORD' },
        };
      }
      return { status: 500, body: { message: 'Internal server error' } };
    }),
  };
});

// Create typed references to the mocks
const mockRegisterUser = registerUser as ReturnType<typeof vi.fn>;
const mockMapErrorToResponse = mapErrorToResponse as ReturnType<typeof vi.fn>;

describe('handleRegister', () => {
  const mockCtx = {
    db: {},
    email: {},
    config: {
      auth: {},
      server: {
        appBaseUrl: 'http://localhost:3000',
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };

  const mockReply = {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };

  const validBody = {
    email: 'test@example.com',
    password: 'SecurePassword123!',
    name: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success cases', () => {
    test('should return 201 with pending_verification status on successful registration', async () => {
      const mockResult = {
        status: 'pending_verification' as const,
        message: 'Registration successful! Please check your email.',
        email: 'test@example.com',
      };
      mockRegisterUser.mockResolvedValue(mockResult);

      const result = await handleRegister(mockCtx as never, validBody, mockReply as never);

      expect(result.status).toBe(201);
      expect(result.body).toEqual(mockResult);
      expect(mockRegisterUser).toHaveBeenCalledWith(
        mockCtx.db,
        mockCtx.email,
        mockCtx.config.auth,
        validBody.email,
        validBody.password,
        validBody.name,
        mockCtx.config.server.appBaseUrl,
      );
    });

    test('should not set any cookies on successful registration (email verification required)', async () => {
      const mockResult = {
        status: 'pending_verification' as const,
        message: 'Registration successful! Please check your email.',
        email: 'test@example.com',
      };
      mockRegisterUser.mockResolvedValue(mockResult);

      await handleRegister(mockCtx as never, validBody, mockReply as never);

      expect(mockReply.setCookie).not.toHaveBeenCalled();
    });

    test('should handle registration without optional name', async () => {
      const mockResult = {
        status: 'pending_verification' as const,
        message: 'Registration successful!',
        email: 'test@example.com',
      };
      mockRegisterUser.mockResolvedValue(mockResult);

      const bodyWithoutName = { email: 'test@example.com', password: 'SecurePassword123!' };
      const result = await handleRegister(mockCtx as never, bodyWithoutName, mockReply as never);

      expect(result.status).toBe(201);
      expect(mockRegisterUser).toHaveBeenCalledWith(
        mockCtx.db,
        mockCtx.email,
        mockCtx.config.auth,
        bodyWithoutName.email,
        bodyWithoutName.password,
        undefined,
        mockCtx.config.server.appBaseUrl,
      );
    });
  });

  describe('email send failure handling', () => {
    test('should return 201 with emailSendFailed flag when email fails after user creation', async () => {
      const originalError = new Error('SMTP error');
      const emailError = new EmailSendError('Failed to send verification email', originalError);
      mockRegisterUser.mockRejectedValue(emailError);

      const result = await handleRegister(mockCtx as never, validBody, mockReply as never);

      expect(result.status).toBe(201);
      expect(result.body).toEqual({
        status: 'pending_verification',
        message:
          'Account created successfully, but we had trouble sending the verification email. Please use the resend verification option.',
        email: validBody.email,
        emailSendFailed: true,
      });
    });

    test('should log error when email send fails', async () => {
      const originalError = new Error('SMTP connection refused');
      const emailError = new EmailSendError('Failed to send verification email', originalError);
      mockRegisterUser.mockRejectedValue(emailError);

      await handleRegister(mockCtx as never, validBody, mockReply as never);

      expect(mockCtx.log.error).toHaveBeenCalledWith(
        { email: validBody.email, originalError: 'SMTP connection refused' },
        'Failed to send verification email after user creation',
      );
    });

    test('should handle EmailSendError without original error', async () => {
      const emailError = new EmailSendError('Failed to send verification email');
      mockRegisterUser.mockRejectedValue(emailError);

      const result = await handleRegister(mockCtx as never, validBody, mockReply as never);

      expect(result.status).toBe(201);
      expect(result.body).toHaveProperty('emailSendFailed', true);
      expect(mockCtx.log.error).toHaveBeenCalledWith(
        { email: validBody.email, originalError: undefined },
        'Failed to send verification email after user creation',
      );
    });
  });

  describe('error cases', () => {
    test('should return 409 when email already exists', async () => {
      // Use the actual error class so instanceof check works
      const error = new EmailAlreadyExistsError('Email already registered: test@example.com');
      mockRegisterUser.mockRejectedValue(error);

      const result = await handleRegister(mockCtx as never, validBody, mockReply as never);

      expect(result.status).toBe(409);
      expect(result.body).toHaveProperty('code', 'EMAIL_EXISTS');
    });

    test('should return 400 when password is weak', async () => {
      // Use the actual error class so instanceof check works
      const error = new WeakPasswordError({
        reasons: ['Password must be at least 8 characters', 'Password must contain a number'],
      });
      mockRegisterUser.mockRejectedValue(error);

      const result = await handleRegister(mockCtx as never, validBody, mockReply as never);

      expect(result.status).toBe(400);
      expect(result.body).toHaveProperty('code', 'WEAK_PASSWORD');
    });

    test('should return 500 for unexpected errors', async () => {
      mockRegisterUser.mockRejectedValue(new Error('Database error'));

      const result = await handleRegister(mockCtx as never, validBody, mockReply as never);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: 'Internal server error' });
    });

    test('should use mapErrorToResponse for non-special errors', async () => {
      const error = new Error('Unknown database error');
      mockRegisterUser.mockRejectedValue(error);

      await handleRegister(mockCtx as never, validBody, mockReply as never);

      expect(mockMapErrorToResponse).toHaveBeenCalledWith(error, mockCtx);
    });
  });

  describe('edge cases', () => {
    test('should pass baseUrl from config to registerUser', async () => {
      const mockResult = {
        status: 'pending_verification' as const,
        message: 'Success',
        email: 'test@example.com',
      };
      mockRegisterUser.mockResolvedValue(mockResult);

      const customCtx = {
        ...mockCtx,
        config: {
          ...mockCtx.config,
          server: { appBaseUrl: 'https://myapp.example.com' },
        },
      };

      await handleRegister(customCtx as never, validBody, mockReply as never);

      expect(mockRegisterUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'https://myapp.example.com',
      );
    });

    test('should handle email with uppercase letters', async () => {
      const mockResult = {
        status: 'pending_verification' as const,
        message: 'Success',
        email: 'TEST@EXAMPLE.COM',
      };
      mockRegisterUser.mockResolvedValue(mockResult);

      const bodyWithUppercase = { ...validBody, email: 'TEST@EXAMPLE.COM' };
      const result = await handleRegister(mockCtx as never, bodyWithUppercase, mockReply as never);

      expect(result.status).toBe(201);
      expect(mockRegisterUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'TEST@EXAMPLE.COM',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    test('should handle special characters in name', async () => {
      const mockResult = {
        status: 'pending_verification' as const,
        message: 'Success',
        email: 'test@example.com',
      };
      mockRegisterUser.mockResolvedValue(mockResult);

      const bodyWithSpecialName = { ...validBody, name: "Jean-Pierre O'Connor" };
      await handleRegister(mockCtx as never, bodyWithSpecialName, mockReply as never);

      expect(mockRegisterUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        "Jean-Pierre O'Connor",
        expect.anything(),
      );
    });
  });
});
