// packages/core/src/__tests__/integration/contracts.integration.test.ts
/**
 * Integration tests for contract schema validation
 *
 * Tests that Zod schemas work together correctly with real-world data scenarios.
 */

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  authResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  registerResponseSchema,
  resetPasswordRequestSchema,
} from '../../contracts/auth';
import {
  emailSchema,
  errorResponseSchema,
  nameSchema,
  passwordSchema,
  uuidSchema,
} from '../../contracts/common';
import { userResponseSchema, userRoleSchema, userSchema } from '../../contracts/users';

describe('Contract Schema Integration', () => {
  describe('Common schemas with real data', () => {
    describe('emailSchema', () => {
      it('should validate standard email formats', () => {
        const validEmails = [
          'user@example.com',
          'user.name@example.com',
          'user+tag@example.com',
          'user@subdomain.example.com',
          'a@b.co',
        ];

        validEmails.forEach((email) => {
          const result = emailSchema.safeParse(email);
          expect(result.success, `Email "${email}" should be valid`).toBe(true);
        });
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          '',
          'not-an-email',
          '@example.com',
          'user@',
          'user@.com',
          'user@example',
          'a'.repeat(256) + '@example.com', // Too long
        ];

        invalidEmails.forEach((email) => {
          const result = emailSchema.safeParse(email);
          expect(result.success, `Email "${email}" should be invalid`).toBe(false);
        });
      });
    });

    describe('passwordSchema', () => {
      it('should validate passwords meeting minimum length', () => {
        const validPasswords = [
          'password',
          'P@ssw0rd!',
          'a'.repeat(8),
          'MySecurePassword123!',
          'a'.repeat(64),
        ];

        validPasswords.forEach((password) => {
          const result = passwordSchema.safeParse(password);
          expect(
            result.success,
            `Password should be valid (length: ${String(password.length)})`,
          ).toBe(true);
        });
      });

      it('should reject passwords that are too short', () => {
        const invalidPasswords = ['', 'short', '1234567', 'a'.repeat(7)];

        invalidPasswords.forEach((password) => {
          const result = passwordSchema.safeParse(password);
          expect(result.success, `Password "${password}" should be invalid`).toBe(false);
        });
      });
    });

    describe('uuidSchema', () => {
      it('should validate correct UUIDs', () => {
        const validUuids = [
          randomUUID(),
          randomUUID(),
          '00000000-0000-0000-0000-000000000000',
          'ffffffff-ffff-ffff-ffff-ffffffffffff',
        ];

        validUuids.forEach((uuid) => {
          const result = uuidSchema.safeParse(uuid);
          expect(result.success, `UUID "${uuid}" should be valid`).toBe(true);
        });
      });

      it('should reject invalid UUIDs', () => {
        const invalidUuids = ['', 'not-a-uuid', '12345678-1234-1234-1234-12345678901', 'invalid'];

        invalidUuids.forEach((uuid) => {
          const result = uuidSchema.safeParse(uuid);
          expect(result.success, `UUID "${uuid}" should be invalid`).toBe(false);
        });
      });
    });

    describe('nameSchema', () => {
      it('should validate names with 2+ characters', () => {
        const result = nameSchema.safeParse('Jo');
        expect(result.success).toBe(true);

        const result2 = nameSchema.safeParse('John Doe');
        expect(result2.success).toBe(true);
      });

      it('should allow undefined (optional)', () => {
        const result = nameSchema.safeParse(undefined);
        expect(result.success).toBe(true);
      });

      it('should reject single character names', () => {
        const result = nameSchema.safeParse('A');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('User schemas with real data', () => {
    it('should validate complete user object', () => {
      const user = {
        id: randomUUID(),
        email: 'john@example.com',
        name: 'John Doe',
        role: 'user',
      };

      const result = userSchema.safeParse(user);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(user);
      }
    });

    it('should validate user with null name', () => {
      const user = {
        id: randomUUID(),
        email: 'jane@example.com',
        name: null,
        role: 'admin',
      };

      const result = userSchema.safeParse(user);
      expect(result.success).toBe(true);
    });

    it('should validate all user roles', () => {
      const roles = ['user', 'admin', 'moderator'];

      roles.forEach((role) => {
        const result = userRoleSchema.safeParse(role);
        expect(result.success, `Role "${role}" should be valid`).toBe(true);
      });
    });

    it('should reject invalid user role', () => {
      const result = userRoleSchema.safeParse('superuser');
      expect(result.success).toBe(false);
    });

    it('should validate userResponseSchema with ISO datetime', () => {
      const userResponse = {
        id: randomUUID(),
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      const result = userResponseSchema.safeParse(userResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Auth request schemas with real data', () => {
    describe('loginRequestSchema', () => {
      it('should validate valid login request', () => {
        const loginData = {
          email: 'user@example.com',
          password: 'SecurePass123!',
        };

        const result = loginRequestSchema.safeParse(loginData);
        expect(result.success).toBe(true);
      });

      it('should reject login with invalid email', () => {
        const loginData = {
          email: 'not-an-email',
          password: 'SecurePass123!',
        };

        const result = loginRequestSchema.safeParse(loginData);
        expect(result.success).toBe(false);
      });

      it('should reject login with short password', () => {
        const loginData = {
          email: 'user@example.com',
          password: 'short',
        };

        const result = loginRequestSchema.safeParse(loginData);
        expect(result.success).toBe(false);
      });
    });

    describe('registerRequestSchema', () => {
      it('should validate valid registration request', () => {
        const registerData = {
          email: 'newuser@example.com',
          name: 'New User',
          password: 'SecurePass123!',
        };

        const result = registerRequestSchema.safeParse(registerData);
        expect(result.success).toBe(true);
      });

      it('should validate registration without name (optional)', () => {
        const registerData = {
          email: 'newuser@example.com',
          password: 'SecurePass123!',
        };

        const result = registerRequestSchema.safeParse(registerData);
        expect(result.success).toBe(true);
      });

      it('should reject registration with single character name', () => {
        const registerData = {
          email: 'newuser@example.com',
          name: 'X',
          password: 'SecurePass123!',
        };

        const result = registerRequestSchema.safeParse(registerData);
        expect(result.success).toBe(false);
      });
    });

    describe('emailVerificationRequestSchema', () => {
      it('should validate verification request with token', () => {
        const verifyData = {
          token: 'verification-token-123',
        };

        const result = emailVerificationRequestSchema.safeParse(verifyData);
        expect(result.success).toBe(true);
      });
    });

    describe('forgotPasswordRequestSchema', () => {
      it('should validate forgot password request', () => {
        const forgotData = {
          email: 'user@example.com',
        };

        const result = forgotPasswordRequestSchema.safeParse(forgotData);
        expect(result.success).toBe(true);
      });
    });

    describe('resetPasswordRequestSchema', () => {
      it('should validate reset password request', () => {
        const resetData = {
          token: 'reset-token-123',
          password: 'NewSecurePass123!',
        };

        const result = resetPasswordRequestSchema.safeParse(resetData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Auth response schemas with real data', () => {
    it('should validate auth response with user', () => {
      const authResponse = {
        token: 'jwt-token-here',
        user: {
          id: randomUUID(),
          email: 'user@example.com',
          name: 'Test User',
          role: 'user',
        },
      };

      const result = authResponseSchema.safeParse(authResponse);
      expect(result.success).toBe(true);
    });

    it('should validate register response', () => {
      const registerResponse = {
        status: 'pending_verification',
        message: 'Please check your email to verify your account',
        email: 'newuser@example.com',
      };

      const result = registerResponseSchema.safeParse(registerResponse);
      expect(result.success).toBe(true);
    });

    it('should validate email verification response', () => {
      const verifyResponse = {
        verified: true,
        token: 'jwt-access-token',
        user: {
          id: randomUUID(),
          email: 'verified@example.com',
          name: 'Verified User',
          role: 'user',
        },
      };

      const result = emailVerificationResponseSchema.safeParse(verifyResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Error response schema', () => {
    it('should validate simple error response', () => {
      const errorResponse = {
        message: 'Something went wrong',
      };

      const result = errorResponseSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });

    it('should validate error response with code', () => {
      const errorResponse = {
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      };

      const result = errorResponseSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });

    it('should validate error response with details', () => {
      const errorResponse = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          email: 'Invalid email format',
          password: 'Password too short',
        },
      };

      const result = errorResponseSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Schema composition integration', () => {
    it('should validate nested user in auth response', () => {
      // Test that userSchema integrates correctly with authResponseSchema
      const userId = randomUUID();
      const authResponse = {
        token: 'jwt.token.here',
        user: {
          id: userId,
          email: 'integration@test.com',
          name: 'Integration Test',
          role: 'moderator',
        },
      };

      const result = authResponseSchema.safeParse(authResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.id).toBe(userId);
        expect(result.data.user.role).toBe('moderator');
      }
    });

    it('should propagate validation errors from nested schemas', () => {
      const authResponse = {
        token: 'jwt.token.here',
        user: {
          id: 'not-a-uuid', // Invalid UUID
          email: 'test@example.com',
          name: 'Test',
          role: 'user',
        },
      };

      const result = authResponseSchema.safeParse(authResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Real-world scenario tests', () => {
    it('should handle complete registration flow data', () => {
      // Step 1: Registration request
      const registerRequest = {
        email: 'newuser@company.com',
        name: 'New User',
        password: 'Str0ngP@ssw0rd!',
      };
      expect(registerRequestSchema.safeParse(registerRequest).success).toBe(true);

      // Step 2: Registration response
      const registerResponse = {
        status: 'pending_verification' as const,
        message: 'Verification email sent',
        email: 'newuser@company.com',
      };
      expect(registerResponseSchema.safeParse(registerResponse).success).toBe(true);

      // Step 3: Email verification request
      const verifyRequest = {
        token: 'abc123def456',
      };
      expect(emailVerificationRequestSchema.safeParse(verifyRequest).success).toBe(true);

      // Step 4: Email verification response (auto-login)
      const verifyResponse = {
        verified: true,
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: randomUUID(),
          email: 'newuser@company.com',
          name: 'New User',
          role: 'user' as const,
        },
      };
      expect(emailVerificationResponseSchema.safeParse(verifyResponse).success).toBe(true);
    });

    it('should handle complete login flow data', () => {
      // Step 1: Login request
      const loginRequest = {
        email: 'existing@company.com',
        password: 'MyP@ssw0rd!',
      };
      expect(loginRequestSchema.safeParse(loginRequest).success).toBe(true);

      // Step 2: Successful login response
      const loginResponse = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: randomUUID(),
          email: 'existing@company.com',
          name: 'Existing User',
          role: 'admin' as const,
        },
      };
      expect(authResponseSchema.safeParse(loginResponse).success).toBe(true);
    });

    it('should handle password reset flow data', () => {
      // Step 1: Forgot password request
      const forgotRequest = {
        email: 'forgot@company.com',
      };
      expect(forgotPasswordRequestSchema.safeParse(forgotRequest).success).toBe(true);

      // Step 2: Reset password request
      const resetRequest = {
        token: 'reset-token-xyz',
        password: 'N3wP@ssw0rd!',
      };
      expect(resetPasswordRequestSchema.safeParse(resetRequest).success).toBe(true);
    });
  });
});
