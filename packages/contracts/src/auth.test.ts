// packages/core/src/contracts/__tests__/auth.test.ts
import { describe, expect, it } from 'vitest';

import {
  authContract,
  authResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
} from './auth';

// ============================================================================
// Request Schema Tests
// ============================================================================

describe('loginRequestSchema', () => {
  it('should validate correct login data', () => {
    const validData = {
      email: 'user@example.com',
      password: 'password123',
    };
    const result = loginRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.password).toBe('password123');
    }
  });

  it('should reject missing email', () => {
    const invalidData = {
      password: 'password123',
    };
    const result = loginRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const invalidData = {
      email: 'user@example.com',
    };
    const result = loginRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const invalidData = {
      email: 'not-an-email',
      password: 'password123',
    };
    const result = loginRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const invalidData = {
      email: 'user@example.com',
      password: 'short',
    };
    const result = loginRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('registerRequestSchema', () => {
  it('should validate correct registration data', () => {
    const validData = {
      email: 'newuser@example.com',
      name: 'John Doe',
      password: 'securepassword123',
    };
    const result = registerRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('newuser@example.com');
      expect(result.data.name).toBe('John Doe');
      expect(result.data.password).toBe('securepassword123');
    }
  });

  it('should accept registration without name (optional)', () => {
    const validData = {
      email: 'newuser@example.com',
      password: 'securepassword123',
    };
    const result = registerRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject name shorter than 2 characters', () => {
    const invalidData = {
      email: 'newuser@example.com',
      name: 'A',
      password: 'securepassword123',
    };
    const result = registerRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject missing email', () => {
    const invalidData = {
      name: 'John Doe',
      password: 'securepassword123',
    };
    const result = registerRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const invalidData = {
      email: 'newuser@example.com',
      name: 'John Doe',
    };
    const result = registerRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('emailVerificationRequestSchema', () => {
  it('should validate correct token', () => {
    const validData = {
      token: 'verification-token-123',
    };
    const result = emailVerificationRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe('verification-token-123');
    }
  });

  it('should reject missing token', () => {
    const invalidData = {};
    const result = emailVerificationRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordRequestSchema', () => {
  it('should validate correct email', () => {
    const validData = {
      email: 'user@example.com',
    };
    const result = forgotPasswordRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidData = {
      email: 'invalid-email',
    };
    const result = forgotPasswordRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('resendVerificationRequestSchema', () => {
  it('should validate correct email', () => {
    const validData = {
      email: 'user@example.com',
    };
    const result = resendVerificationRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidData = {
      email: 'not-valid',
    };
    const result = resendVerificationRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordRequestSchema', () => {
  it('should validate correct reset data', () => {
    const validData = {
      token: 'reset-token-123',
      password: 'newpassword123',
    };
    const result = resetPasswordRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe('reset-token-123');
      expect(result.data.password).toBe('newpassword123');
    }
  });

  it('should reject missing token', () => {
    const invalidData = {
      password: 'newpassword123',
    };
    const result = resetPasswordRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const invalidData = {
      token: 'reset-token-123',
      password: 'short',
    };
    const result = resetPasswordRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Response Schema Tests
// ============================================================================

describe('authResponseSchema', () => {
  it('should validate correct auth response', () => {
    const validData = {
      token: 'jwt-token-123',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        name: 'John Doe',
        role: 'user',
        createdAt: '2024-01-15T10:00:00.000Z',
      },
    };
    const result = authResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject missing token', () => {
    const invalidData = {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        name: 'John Doe',
        role: 'user',
        createdAt: '2024-01-15T10:00:00.000Z',
      },
    };
    const result = authResponseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject missing user', () => {
    const invalidData = {
      token: 'jwt-token-123',
    };
    const result = authResponseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('registerResponseSchema', () => {
  it('should validate correct registration response', () => {
    const validData = {
      status: 'pending_verification',
      message: 'Please check your email to verify your account',
      email: 'newuser@example.com',
    };
    const result = registerResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid status value', () => {
    const invalidData = {
      status: 'verified',
      message: 'Account created',
      email: 'newuser@example.com',
    };
    const result = registerResponseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should only accept pending_verification status', () => {
    const validData = {
      status: 'pending_verification',
      message: 'Check email',
      email: 'test@example.com',
    };
    const result = registerResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('pending_verification');
    }
  });
});

describe('refreshResponseSchema', () => {
  it('should validate correct refresh response', () => {
    const validData = {
      token: 'new-jwt-token',
    };
    const result = refreshResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject missing token', () => {
    const invalidData = {};
    const result = refreshResponseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('logoutResponseSchema', () => {
  it('should validate correct logout response', () => {
    const validData = {
      message: 'Logged out successfully',
    };
    const result = logoutResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject missing message', () => {
    const invalidData = {};
    const result = logoutResponseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('emailVerificationResponseSchema', () => {
  it('should validate correct verification response', () => {
    const validData = {
      verified: true,
      token: 'auth-token',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        name: 'John',
        role: 'user',
        createdAt: '2024-01-15T10:00:00.000Z',
      },
    };
    const result = emailVerificationResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject missing verified field', () => {
    const invalidData = {
      token: 'auth-token',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        name: 'John',
        role: 'user',
        createdAt: '2024-01-15T10:00:00.000Z',
      },
    };
    const result = emailVerificationResponseSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordResponseSchema', () => {
  it('should validate correct response', () => {
    const validData = {
      message: 'Password reset email sent',
    };
    const result = forgotPasswordResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('resendVerificationResponseSchema', () => {
  it('should validate correct response', () => {
    const validData = {
      message: 'Verification email sent',
    };
    const result = resendVerificationResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('resetPasswordResponseSchema', () => {
  it('should validate correct response', () => {
    const validData = {
      message: 'Password reset successfully',
    };
    const result = resetPasswordResponseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Contract Tests
// ============================================================================

describe('authContract', () => {
  it('should have all auth endpoints defined', () => {
    expect(authContract.register).toBeDefined();
    expect(authContract.login).toBeDefined();
    expect(authContract.refresh).toBeDefined();
    expect(authContract.logout).toBeDefined();
    expect(authContract.verifyEmail).toBeDefined();
    expect(authContract.resendVerification).toBeDefined();
    expect(authContract.forgotPassword).toBeDefined();
    expect(authContract.resetPassword).toBeDefined();
  });

  it('should have correct HTTP methods', () => {
    expect(authContract.register.method).toBe('POST');
    expect(authContract.login.method).toBe('POST');
    expect(authContract.refresh.method).toBe('POST');
    expect(authContract.logout.method).toBe('POST');
    expect(authContract.verifyEmail.method).toBe('POST');
    expect(authContract.resendVerification.method).toBe('POST');
    expect(authContract.forgotPassword.method).toBe('POST');
    expect(authContract.resetPassword.method).toBe('POST');
  });

  it('should have correct paths', () => {
    expect(authContract.register.path).toBe('/api/auth/register');
    expect(authContract.login.path).toBe('/api/auth/login');
    expect(authContract.refresh.path).toBe('/api/auth/refresh');
    expect(authContract.logout.path).toBe('/api/auth/logout');
    expect(authContract.verifyEmail.path).toBe('/api/auth/verify-email');
    expect(authContract.resendVerification.path).toBe('/api/auth/resend-verification');
    expect(authContract.forgotPassword.path).toBe('/api/auth/forgot-password');
    expect(authContract.resetPassword.path).toBe('/api/auth/reset-password');
  });
});
