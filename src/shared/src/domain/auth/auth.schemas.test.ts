// src/shared/src/domain/auth/auth.schemas.test.ts

/**
 * @file Auth Schemas Tests
 * @description Comprehensive unit tests for authentication request and response schemas.
 * Tests validation logic, edge cases, and error handling for 20+ auth-related schemas.
 * @module Domain/Auth
 */

import { describe, expect, it } from 'vitest';

import {
  authResponseSchema,
  changeEmailRequestSchema,
  confirmEmailChangeRequestSchema,
  emailVerificationRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  registerRequestSchema,
  registerResponseSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  setPasswordRequestSchema,
  totpSetupResponseSchema,
  totpVerifyRequestSchema,
} from './auth.schemas';

// ============================================================================
// Request Schemas - Login & Registration
// ============================================================================

describe('loginRequestSchema', () => {
  it('should validate valid login credentials with email', () => {
    const validLogin = {
      identifier: 'user@example.com',
      password: 'password123',
    };
    const result = loginRequestSchema.safeParse(validLogin);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.identifier).toBe('user@example.com');
      expect(result.data.password).toBe('password123');
    }
  });

  it('should validate valid login credentials with username', () => {
    const validLogin = {
      identifier: 'johndoe',
      password: 'password123',
    };
    const result = loginRequestSchema.safeParse(validLogin);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.identifier).toBe('johndoe');
      expect(result.data.password).toBe('password123');
    }
  });

  it('should trim identifier', () => {
    const loginWithUntrimmedIdentifier = {
      identifier: '  user@example.com  ',
      password: 'password123',
    };
    const result = loginRequestSchema.safeParse(loginWithUntrimmedIdentifier);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.identifier).toBe('user@example.com');
    }
  });

  it('should reject non-string identifier', () => {
    const invalidLogin = {
      identifier: 12345,
      password: 'password123',
    };
    const result = loginRequestSchema.safeParse(invalidLogin);
    expect(result.success).toBe(false);
  });

  it('should reject empty identifier', () => {
    const invalidLogin = {
      identifier: '',
      password: 'password123',
    };
    const result = loginRequestSchema.safeParse(invalidLogin);
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const invalidLogin = {
      identifier: 'user@example.com',
      password: 'short',
    };
    const result = loginRequestSchema.safeParse(invalidLogin);
    expect(result.success).toBe(false);
  });

  it('should reject missing identifier field', () => {
    const invalidLogin = {
      password: 'password123',
    };
    const result = loginRequestSchema.safeParse(invalidLogin);
    expect(result.success).toBe(false);
  });

  it('should reject missing password field', () => {
    const invalidLogin = {
      identifier: 'user@example.com',
    };
    const result = loginRequestSchema.safeParse(invalidLogin);
    expect(result.success).toBe(false);
  });

  it('should reject non-object input', () => {
    const result = loginRequestSchema.safeParse('string');
    expect(result.success).toBe(false);
  });
});

describe('registerRequestSchema', () => {
  it('should validate registration with all required fields', () => {
    const validRegister = {
      email: 'user@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      password: 'password123',
    };
    const result = registerRequestSchema.safeParse(validRegister);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.username).toBe('johndoe');
      expect(result.data.firstName).toBe('John');
      expect(result.data.lastName).toBe('Doe');
      expect(result.data.password).toBe('password123');
    }
  });

  it('should trim all string fields', () => {
    const validRegister = {
      email: '  user@example.com  ',
      username: '  johndoe  ',
      firstName: '  John  ',
      lastName: '  Doe  ',
      password: 'password123',
    };
    const result = registerRequestSchema.safeParse(validRegister);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.username).toBe('johndoe');
      expect(result.data.firstName).toBe('John');
      expect(result.data.lastName).toBe('Doe');
    }
  });

  it('should reject missing username', () => {
    const invalidRegister = {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'password123',
    };
    const result = registerRequestSchema.safeParse(invalidRegister);
    expect(result.success).toBe(false);
  });

  it('should reject username shorter than 2 characters', () => {
    const invalidRegister = {
      email: 'user@example.com',
      username: 'a',
      firstName: 'John',
      lastName: 'Doe',
      password: 'password123',
    };
    const result = registerRequestSchema.safeParse(invalidRegister);
    expect(result.success).toBe(false);
  });

  it('should accept username with exactly 2 characters', () => {
    const validRegister = {
      email: 'user@example.com',
      username: 'jo',
      firstName: 'John',
      lastName: 'Doe',
      password: 'password123',
    };
    const result = registerRequestSchema.safeParse(validRegister);
    expect(result.success).toBe(true);
  });

  it('should reject empty firstName', () => {
    const invalidRegister = {
      email: 'user@example.com',
      username: 'johndoe',
      firstName: '',
      lastName: 'Doe',
      password: 'password123',
    };
    const result = registerRequestSchema.safeParse(invalidRegister);
    expect(result.success).toBe(false);
  });

  it('should reject empty lastName', () => {
    const invalidRegister = {
      email: 'user@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: '',
      password: 'password123',
    };
    const result = registerRequestSchema.safeParse(invalidRegister);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const invalidRegister = {
      email: 'invalid-email',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      password: 'password123',
    };
    const result = registerRequestSchema.safeParse(invalidRegister);
    expect(result.success).toBe(false);
  });

  it('should reject short password', () => {
    const invalidRegister = {
      email: 'user@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      password: 'short',
    };
    const result = registerRequestSchema.safeParse(invalidRegister);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Request Schemas - Email Verification
// ============================================================================

describe('emailVerificationRequestSchema', () => {
  it('should validate valid token', () => {
    const validRequest = {
      token: 'valid-verification-token',
    };
    const result = emailVerificationRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe('valid-verification-token');
    }
  });

  it('should reject empty token', () => {
    const invalidRequest = {
      token: '',
    };
    const result = emailVerificationRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject missing token', () => {
    const invalidRequest = {};
    const result = emailVerificationRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject non-string token', () => {
    const invalidRequest = {
      token: 12345,
    };
    const result = emailVerificationRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordRequestSchema', () => {
  it('should validate valid email', () => {
    const validRequest = {
      email: 'user@example.com',
    };
    const result = forgotPasswordRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidRequest = {
      email: 'not-an-email',
    };
    const result = forgotPasswordRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe('resendVerificationRequestSchema', () => {
  it('should validate valid email', () => {
    const validRequest = {
      email: 'user@example.com',
    };
    const result = resendVerificationRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidRequest = {
      email: 'invalid',
    };
    const result = resendVerificationRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Request Schemas - Password Reset
// ============================================================================

describe('resetPasswordRequestSchema', () => {
  it('should validate valid token and password', () => {
    const validRequest = {
      token: 'reset-token-abc123',
      password: 'newpassword123',
    };
    const result = resetPasswordRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe('reset-token-abc123');
      expect(result.data.password).toBe('newpassword123');
    }
  });

  it('should reject empty token', () => {
    const invalidRequest = {
      token: '',
      password: 'newpassword123',
    };
    const result = resetPasswordRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const invalidRequest = {
      token: 'reset-token-abc123',
      password: 'short',
    };
    const result = resetPasswordRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject missing token', () => {
    const invalidRequest = {
      password: 'newpassword123',
    };
    const result = resetPasswordRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const invalidRequest = {
      token: 'reset-token-abc123',
    };
    const result = resetPasswordRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe('setPasswordRequestSchema', () => {
  it('should validate valid password', () => {
    const validRequest = {
      password: 'newpassword123',
    };
    const result = setPasswordRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe('newpassword123');
    }
  });

  it('should accept password with exactly 8 characters', () => {
    const validRequest = {
      password: '12345678',
    };
    const result = setPasswordRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject password shorter than 8 characters', () => {
    const invalidRequest = {
      password: 'short',
    };
    const result = setPasswordRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const invalidRequest = {};
    const result = setPasswordRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Request Schemas - Magic Link
// ============================================================================

describe('magicLinkRequestSchema', () => {
  it('should validate valid email', () => {
    const validRequest = {
      email: 'user@example.com',
    };
    const result = magicLinkRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('should trim and lowercase email', () => {
    const request = {
      email: '  USER@EXAMPLE.COM  ',
    };
    const result = magicLinkRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('should reject invalid email', () => {
    const invalidRequest = {
      email: 'not-an-email',
    };
    const result = magicLinkRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject missing email', () => {
    const invalidRequest = {};
    const result = magicLinkRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe('magicLinkVerifyRequestSchema', () => {
  it('should validate valid token', () => {
    const validRequest = {
      token: 'magic-link-token-xyz',
    };
    const result = magicLinkVerifyRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe('magic-link-token-xyz');
    }
  });

  it('should reject empty token', () => {
    const invalidRequest = {
      token: '',
    };
    const result = magicLinkVerifyRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject non-string token', () => {
    const invalidRequest = {
      token: null,
    };
    const result = magicLinkVerifyRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Request Schemas - Email Change
// ============================================================================

describe('changeEmailRequestSchema', () => {
  it('should validate valid email change request', () => {
    const validRequest = {
      newEmail: 'newemail@example.com',
      password: 'currentpassword123',
    };
    const result = changeEmailRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newEmail).toBe('newemail@example.com');
      expect(result.data.password).toBe('currentpassword123');
    }
  });

  it('should trim and lowercase new email', () => {
    const request = {
      newEmail: '  NEWEMAIL@EXAMPLE.COM  ',
      password: 'currentpassword123',
    };
    const result = changeEmailRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newEmail).toBe('newemail@example.com');
    }
  });

  it('should reject invalid new email', () => {
    const invalidRequest = {
      newEmail: 'invalid-email',
      password: 'currentpassword123',
    };
    const result = changeEmailRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject short password', () => {
    const invalidRequest = {
      newEmail: 'newemail@example.com',
      password: 'short',
    };
    const result = changeEmailRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject missing newEmail', () => {
    const invalidRequest = {
      password: 'currentpassword123',
    };
    const result = changeEmailRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const invalidRequest = {
      newEmail: 'newemail@example.com',
    };
    const result = changeEmailRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe('confirmEmailChangeRequestSchema', () => {
  it('should validate valid token', () => {
    const validRequest = {
      token: 'email-change-confirmation-token',
    };
    const result = confirmEmailChangeRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe('email-change-confirmation-token');
    }
  });

  it('should reject empty token', () => {
    const invalidRequest = {
      token: '',
    };
    const result = confirmEmailChangeRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Request Schemas - TOTP (2FA)
// ============================================================================

describe('totpVerifyRequestSchema', () => {
  it('should validate valid 6-digit code', () => {
    const validRequest = {
      code: '123456',
    };
    const result = totpVerifyRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('123456');
    }
  });

  it('should accept code longer than 6 characters', () => {
    const validRequest = {
      code: '1234567890',
    };
    const result = totpVerifyRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject code shorter than 6 characters', () => {
    const invalidRequest = {
      code: '12345',
    };
    const result = totpVerifyRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject empty code', () => {
    const invalidRequest = {
      code: '',
    };
    const result = totpVerifyRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject non-string code', () => {
    const invalidRequest = {
      code: 123456,
    };
    const result = totpVerifyRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject missing code', () => {
    const invalidRequest = {};
    const result = totpVerifyRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Response Schemas - Auth Response
// ============================================================================

describe('authResponseSchema', () => {
  it('should validate complete auth response with all user fields', () => {
    const validResponse = {
      token: 'jwt-token-abc123',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'user@example.com',
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'user',
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = authResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe('jwt-token-abc123');
      expect(result.data.user.id).toBe('00000000-0000-0000-0000-000000000001');
      expect(result.data.user.email).toBe('user@example.com');
      expect(result.data.user.username).toBe('johndoe');
      expect(result.data.user.firstName).toBe('John');
      expect(result.data.user.lastName).toBe('Doe');
      expect(result.data.user.role).toBe('user');
      expect(result.data.user.emailVerified).toBe(true);
    }
  });

  it('should validate auth response with null avatarUrl', () => {
    const validResponse = {
      token: 'jwt-token-abc123',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'user@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user',
        emailVerified: false,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = authResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.avatarUrl).toBeNull();
    }
  });

  it('should validate auth response with admin role', () => {
    const validResponse = {
      token: 'jwt-token-abc123',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@example.com',
        username: 'adminuser',
        firstName: 'Admin',
        lastName: 'User',
        avatarUrl: null,
        role: 'admin',
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = authResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.role).toBe('admin');
    }
  });

  it('should validate auth response with moderator role', () => {
    const validResponse = {
      token: 'jwt-token-abc123',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'mod@example.com',
        username: 'moderator',
        firstName: 'Mod',
        lastName: 'User',
        avatarUrl: null,
        role: 'moderator',
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = authResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.role).toBe('moderator');
    }
  });

  it('should reject response with invalid user id (not UUID)', () => {
    const invalidResponse = {
      token: 'jwt-token-abc123',
      user: {
        id: 'not-a-uuid',
        email: 'user@example.com',
        name: 'John Doe',
        avatarUrl: null,
        role: 'user',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = authResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with invalid email', () => {
    const invalidResponse = {
      token: 'jwt-token-abc123',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'invalid-email',
        name: 'John Doe',
        avatarUrl: null,
        role: 'user',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = authResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with invalid role', () => {
    const invalidResponse = {
      token: 'jwt-token-abc123',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'user@example.com',
        name: 'John Doe',
        avatarUrl: null,
        role: 'superadmin',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = authResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with invalid emailVerified (non-boolean)', () => {
    const invalidResponse = {
      token: 'jwt-token-abc123',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'user@example.com',
        name: 'John Doe',
        avatarUrl: null,
        role: 'user',
        emailVerified: 'true',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = authResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with invalid ISO datetime format', () => {
    const invalidResponse = {
      token: 'jwt-token-abc123',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'user@example.com',
        name: 'John Doe',
        avatarUrl: null,
        role: 'user',
        emailVerified: true,
        createdAt: 'not-a-date',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = authResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with missing token', () => {
    const invalidResponse = {
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'user@example.com',
        name: 'John Doe',
        avatarUrl: null,
        role: 'user',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = authResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with missing user', () => {
    const invalidResponse = {
      token: 'jwt-token-abc123',
    };
    const result = authResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Response Schemas - Register Response
// ============================================================================

describe('registerResponseSchema', () => {
  it('should validate valid register response', () => {
    const validResponse = {
      status: 'pending_verification',
      message: 'Please check your email to verify your account',
      email: 'user@example.com',
    };
    const result = registerResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('pending_verification');
      expect(result.data.message).toBe('Please check your email to verify your account');
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('should reject response with incorrect status literal', () => {
    const invalidResponse = {
      status: 'verified',
      message: 'Account created',
      email: 'user@example.com',
    };
    const result = registerResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with invalid email', () => {
    const invalidResponse = {
      status: 'pending_verification',
      message: 'Please verify',
      email: 'invalid-email',
    };
    const result = registerResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with missing status', () => {
    const invalidResponse = {
      message: 'Please verify',
      email: 'user@example.com',
    };
    const result = registerResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with missing message', () => {
    const invalidResponse = {
      status: 'pending_verification',
      email: 'user@example.com',
    };
    const result = registerResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with missing email', () => {
    const invalidResponse = {
      status: 'pending_verification',
      message: 'Please verify',
    };
    const result = registerResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Response Schemas - TOTP Setup Response
// ============================================================================

describe('totpSetupResponseSchema', () => {
  it('should validate valid TOTP setup response', () => {
    const validResponse = {
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example',
      backupCodes: ['code1', 'code2', 'code3', 'code4', 'code5'],
    };
    const result = totpSetupResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.data.otpauthUrl).toContain('otpauth://totp/');
      expect(result.data.backupCodes).toHaveLength(5);
      expect(result.data.backupCodes[0]).toBe('code1');
    }
  });

  it('should validate TOTP setup response with empty backup codes array', () => {
    const validResponse = {
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP',
      backupCodes: [],
    };
    const result = totpSetupResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.backupCodes).toHaveLength(0);
    }
  });

  it('should reject response with non-array backupCodes', () => {
    const invalidResponse = {
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP',
      backupCodes: 'not-an-array',
    };
    const result = totpSetupResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('backupCodes must be an array');
    }
  });

  it('should reject response with null backupCodes', () => {
    const invalidResponse = {
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP',
      backupCodes: null,
    };
    const result = totpSetupResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with non-string item in backupCodes array', () => {
    const invalidResponse = {
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP',
      backupCodes: ['code1', 'code2', 12345],
    };
    const result = totpSetupResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with missing secret', () => {
    const invalidResponse = {
      otpauthUrl: 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP',
      backupCodes: ['code1', 'code2'],
    };
    const result = totpSetupResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with missing otpauthUrl', () => {
    const invalidResponse = {
      secret: 'JBSWY3DPEHPK3PXP',
      backupCodes: ['code1', 'code2'],
    };
    const result = totpSetupResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject response with missing backupCodes', () => {
    const invalidResponse = {
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP',
    };
    const result = totpSetupResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});
