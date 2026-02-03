// core/src/__tests__/integration/contracts.integration.test.ts
/**
 * Integration tests for contract schema validation
 *
 * Tests that schemas work together correctly with real-world data scenarios.
 * Uses manual TypeScript validation (no longer using Zod).
 */

import { randomUUID } from 'node:crypto';

import {
  authResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  registerResponseSchema,
  resetPasswordRequestSchema,
} from '@abe-stack/contracts/auth';
import {
  emailSchema,
  errorResponseSchema,
  nameSchema,
  passwordSchema,
  uuidSchema,
} from '@abe-stack/contracts/common';
import { userRoleSchema, userSchema } from '@abe-stack/contracts/users';
import { describe, expect, it } from 'vitest';

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

          // Verify parsed data matches input
          if (result.success) {
            expect(result.data).toBe(email);
            expect(typeof result.data).toBe('string');
          }
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

          // Verify error structure when validation fails
          if (!result.success) {
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error.message.length).toBeGreaterThan(0);
          }
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

          // Verify parsed data matches input
          if (result.success) {
            expect(result.data).toBe(password);
            expect(result.data.length).toBeGreaterThanOrEqual(8);
          }
        });
      });

      it('should reject passwords that are too short', () => {
        const invalidPasswords = ['', 'short', '1234567', 'a'.repeat(7)];

        invalidPasswords.forEach((password) => {
          const result = passwordSchema.safeParse(password);
          expect(result.success, `Password "${password}" should be invalid`).toBe(false);

          // Verify error structure
          if (!result.success) {
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error.message).toContain('8');
          }
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

          // Verify parsed data shape
          if (result.success) {
            expect(result.data).toBe(uuid);
            // Verify UUID format (8-4-4-4-12)
            expect(result.data).toMatch(
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            );
          }
        });
      });

      it('should reject invalid UUIDs', () => {
        const invalidUuids = ['', 'not-a-uuid', '12345678-1234-1234-1234-12345678901', 'invalid'];

        invalidUuids.forEach((uuid) => {
          const result = uuidSchema.safeParse(uuid);
          expect(result.success, `UUID "${uuid}" should be invalid`).toBe(false);

          // Verify error structure
          if (!result.success) {
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error.message.length).toBeGreaterThan(0);
          }
        });
      });
    });

    describe('nameSchema', () => {
      it('should validate names with 2+ characters', () => {
        const result = nameSchema.safeParse('Jo');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('Jo');
          expect(result.data!.length).toBeGreaterThanOrEqual(2);
        }

        const result2 = nameSchema.safeParse('John Doe');
        expect(result2.success).toBe(true);
        if (result2.success) {
          expect(result2.data).toBe('John Doe');
        }
      });

      it('should allow undefined (optional)', () => {
        const result = nameSchema.safeParse(undefined);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeUndefined();
        }
      });

      it('should reject single character names', () => {
        const result = nameSchema.safeParse('A');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message).toContain('2');
        }
      });
    });
  });

  describe('User schemas with real data', () => {
    it('should validate complete user object', () => {
      const user = {
        id: randomUUID(),
        email: 'john@example.com',
        name: 'John Doe',
        avatarUrl: null,
        role: 'user',
        createdAt: new Date().toISOString(),
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
        avatarUrl: null,
        role: 'admin',
        createdAt: new Date().toISOString(),
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

        // Verify parsed shape
        if (result.success) {
          expect(result.data).toEqual(loginData);
          expect(result.data).toHaveProperty('email', 'user@example.com');
          expect(result.data).toHaveProperty('password', 'SecurePass123!');
        }
      });

      it('should reject login with invalid email', () => {
        const loginData = {
          email: 'not-an-email',
          password: 'SecurePass123!',
        };

        const result = loginRequestSchema.safeParse(loginData);
        expect(result.success).toBe(false);

        // Verify error mentions email
        if (!result.success) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message.toLowerCase()).toContain('email');
        }
      });

      it('should reject login with short password', () => {
        const loginData = {
          email: 'user@example.com',
          password: 'short',
        };

        const result = loginRequestSchema.safeParse(loginData);
        expect(result.success).toBe(false);

        // Verify error mentions password
        if (!result.success) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message.toLowerCase()).toContain('password');
        }
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

        // Verify parsed shape includes all fields
        if (result.success) {
          expect(result.data).toEqual(registerData);
          expect(result.data).toHaveProperty('email', 'newuser@example.com');
          expect(result.data).toHaveProperty('name', 'New User');
          expect(result.data).toHaveProperty('password', 'SecurePass123!');
        }
      });

      it('should validate registration without name (optional)', () => {
        const registerData = {
          email: 'newuser@example.com',
          password: 'SecurePass123!',
        };

        const result = registerRequestSchema.safeParse(registerData);
        expect(result.success).toBe(true);

        // Verify name is optional
        if (result.success) {
          expect(result.data).toHaveProperty('email');
          expect(result.data).toHaveProperty('password');
          expect(result.data.name).toBeUndefined();
        }
      });

      it('should reject registration with single character name', () => {
        const registerData = {
          email: 'newuser@example.com',
          name: 'X',
          password: 'SecurePass123!',
        };

        const result = registerRequestSchema.safeParse(registerData);
        expect(result.success).toBe(false);

        // Verify error mentions name
        if (!result.success) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message.toLowerCase()).toContain('name');
        }
      });
    });

    describe('emailVerificationRequestSchema', () => {
      it('should validate verification request with token', () => {
        const verifyData = {
          token: 'verification-token-123',
        };

        const result = emailVerificationRequestSchema.safeParse(verifyData);
        expect(result.success).toBe(true);

        // Verify parsed shape
        if (result.success) {
          expect(result.data).toEqual(verifyData);
          expect(result.data.token).toBe('verification-token-123');
        }
      });
    });

    describe('forgotPasswordRequestSchema', () => {
      it('should validate forgot password request', () => {
        const forgotData = {
          email: 'user@example.com',
        };

        const result = forgotPasswordRequestSchema.safeParse(forgotData);
        expect(result.success).toBe(true);

        // Verify parsed shape
        if (result.success) {
          expect(result.data).toEqual(forgotData);
          expect(result.data.email).toBe('user@example.com');
        }
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

        // Verify parsed shape
        if (result.success) {
          expect(result.data).toEqual(resetData);
          expect(result.data.token).toBe('reset-token-123');
          expect(result.data.password).toBe('NewSecurePass123!');
        }
      });
    });
  });

  describe('Auth response schemas with real data', () => {
    it('should validate auth response with user', () => {
      const userId = randomUUID();
      const createdAt = new Date().toISOString();
      const authResponse = {
        token: 'jwt-token-here',
        user: {
          id: userId,
          email: 'user@example.com',
          name: 'Test User',
          avatarUrl: null,
          role: 'user',
          createdAt,
        },
      };

      const result = authResponseSchema.safeParse(authResponse);
      expect(result.success).toBe(true);

      // Verify parsed shape matches expected structure
      if (result.success) {
        expect(result.data.token).toBe('jwt-token-here');
        expect(result.data.user).toEqual({
          id: userId,
          email: 'user@example.com',
          name: 'Test User',
          avatarUrl: null,
          role: 'user',
          createdAt,
        });
        expect(result.data.user.id).toBe(userId);
        expect(result.data.user.email).toBe('user@example.com');
      }
    });

    it('should validate register response', () => {
      const registerResponse = {
        status: 'pending_verification',
        message: 'Please check your email to verify your account',
        email: 'newuser@example.com',
      };

      const result = registerResponseSchema.safeParse(registerResponse);
      expect(result.success).toBe(true);

      // Verify parsed shape
      if (result.success) {
        expect(result.data.status).toBe('pending_verification');
        expect(result.data.message).toBe('Please check your email to verify your account');
        expect(result.data.email).toBe('newuser@example.com');
      }
    });

    it('should validate email verification response', () => {
      const userId = randomUUID();
      const verifyResponse = {
        verified: true,
        token: 'jwt-access-token',
        user: {
          id: userId,
          email: 'verified@example.com',
          name: 'Verified User',
          role: 'user',
          createdAt: new Date().toISOString(),
        },
      };

      const result = emailVerificationResponseSchema.safeParse(verifyResponse);
      expect(result.success).toBe(true);

      // Verify parsed shape
      if (result.success) {
        expect(result.data.verified).toBe(true);
        expect(result.data.token).toBe('jwt-access-token');
        expect(result.data.user.id).toBe(userId);
        expect(result.data.user.email).toBe('verified@example.com');
        expect(result.data.user.name).toBe('Verified User');
        expect(result.data.user.role).toBe('user');
      }
    });
  });

  describe('Error response schema', () => {
    it('should validate simple error response', () => {
      const errorResponse = {
        message: 'Something went wrong',
      };

      const result = errorResponseSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);

      // Verify parsed shape
      if (result.success) {
        expect(result.data.message).toBe('Something went wrong');
        expect(result.data.code).toBeUndefined();
        expect(result.data.details).toBeUndefined();
      }
    });

    it('should validate error response with code', () => {
      const errorResponse = {
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      };

      const result = errorResponseSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);

      // Verify parsed shape includes code
      if (result.success) {
        expect(result.data.message).toBe('Invalid credentials');
        expect(result.data.code).toBe('INVALID_CREDENTIALS');
      }
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

      // Verify parsed shape includes all fields
      if (result.success) {
        expect(result.data.message).toBe('Validation failed');
        expect(result.data.code).toBe('VALIDATION_ERROR');
        expect(result.data.details).toEqual({
          email: 'Invalid email format',
          password: 'Password too short',
        });
      }
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
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
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
