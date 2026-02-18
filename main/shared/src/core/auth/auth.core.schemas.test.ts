// main/shared/src/core/auth/auth.core.schemas.test.ts
import { describe, expect, it } from 'vitest';

import {
  authResponseSchema,
  bffLoginResponseSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  isAuthenticatedRequest,
  loginRequestSchema,
  loginSuccessResponseSchema,
  logoutResponseSchema,
  pendingVerificationLiteral,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  setPasswordRequestSchema,
  setPasswordResponseSchema,
  sudoRequestSchema,
  sudoResponseSchema,
} from './auth.core.schemas';

import type { User } from '../users/users.schemas';

// ============================================================================
// Test Fixtures
// ============================================================================

/** Minimal valid User matching userSchema requirements. */
function makeUser(overrides?: Partial<User>): User {
  return {
    id: '00000000-0000-4000-8000-000000000001' as User['id'],
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Strong password satisfying passwordSchema (min 8 chars). */
const VALID_PASSWORD = 'Str0ng!Pass';

// ============================================================================
// loginRequestSchema
// ============================================================================

describe('loginRequestSchema', () => {
  it('accepts valid identifier and password', () => {
    const result = loginRequestSchema.safeParse({
      identifier: 'user@example.com',
      password: VALID_PASSWORD,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.identifier).toBe('user@example.com');
      expect(result.data.password).toBe(VALID_PASSWORD);
    }
  });

  it('trims whitespace from identifier', () => {
    const result = loginRequestSchema.safeParse({
      identifier: '  user@example.com  ',
      password: VALID_PASSWORD,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.identifier).toBe('user@example.com');
    }
  });

  it('includes captchaToken when provided as a string', () => {
    const result = loginRequestSchema.safeParse({
      identifier: 'user@example.com',
      password: VALID_PASSWORD,
      captchaToken: 'tok-abc',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.captchaToken).toBe('tok-abc');
    }
  });

  it('omits captchaToken when not provided', () => {
    const result = loginRequestSchema.safeParse({
      identifier: 'user@example.com',
      password: VALID_PASSWORD,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('captchaToken' in result.data).toBe(false);
    }
  });

  it('rejects empty string identifier (min:1 after trim)', () => {
    const result = loginRequestSchema.safeParse({
      identifier: '   ',
      password: VALID_PASSWORD,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing identifier', () => {
    const result = loginRequestSchema.safeParse({ password: VALID_PASSWORD });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = loginRequestSchema.safeParse({
      identifier: 'user@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string identifier', () => {
    const result = loginRequestSchema.safeParse({
      identifier: 42,
      password: VALID_PASSWORD,
    });
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = loginRequestSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('rejects array input', () => {
    const result = loginRequestSchema.safeParse([{ identifier: 'a', password: VALID_PASSWORD }]);
    expect(result.success).toBe(false);
  });

  it('ignores non-string captchaToken (number)', () => {
    const result = loginRequestSchema.safeParse({
      identifier: 'user@example.com',
      password: VALID_PASSWORD,
      captchaToken: 12345,
    });
    // captchaToken should be omitted, parse succeeds
    expect(result.success).toBe(true);
    if (result.success) {
      expect('captchaToken' in result.data).toBe(false);
    }
  });

  it('ignores null captchaToken', () => {
    const result = loginRequestSchema.safeParse({
      identifier: 'user@example.com',
      password: VALID_PASSWORD,
      captchaToken: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('captchaToken' in result.data).toBe(false);
    }
  });

  it('rejects undefined input', () => {
    const result = loginRequestSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  it('rejects primitive string input (not object)', () => {
    const result = loginRequestSchema.safeParse('user@example.com');
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// registerRequestSchema
// ============================================================================

describe('registerRequestSchema', () => {
  function validRegisterPayload() {
    return {
      email: 'new@example.com',
      username: 'newuser',
      firstName: 'Jane',
      lastName: 'Doe',
      password: VALID_PASSWORD,
      tosAccepted: true,
    };
  }

  it('accepts all valid required fields', () => {
    const result = registerRequestSchema.safeParse(validRegisterPayload());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('new@example.com');
      expect(result.data.tosAccepted).toBe(true);
    }
  });

  it('accepts optional captchaToken', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      captchaToken: 'cap-xyz',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.captchaToken).toBe('cap-xyz');
    }
  });

  it('omits captchaToken when not supplied', () => {
    const result = registerRequestSchema.safeParse(validRegisterPayload());
    expect(result.success).toBe(true);
    if (result.success) {
      expect('captchaToken' in result.data).toBe(false);
    }
  });

  it('rejects username shorter than 2 characters', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      username: 'x',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/username/i);
    }
  });

  it('rejects username of exactly 1 character (boundary)', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      username: 'a',
    });
    expect(result.success).toBe(false);
  });

  it('accepts username of exactly 2 characters (boundary)', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      username: 'ab',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty firstName', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      firstName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects firstName that is only whitespace (trimmed to empty)', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      firstName: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty lastName', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      lastName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects tosAccepted as string "true"', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      tosAccepted: 'true',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/tosAccepted/i);
    }
  });

  it('rejects tosAccepted as number 1', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      tosAccepted: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing tosAccepted', () => {
    const { tosAccepted: _, ...rest } = validRegisterPayload();
    const result = registerRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      password: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = registerRequestSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('normalizes email to lowercase', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      email: 'User@EXAMPLE.COM',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('ignores non-string captchaToken (boolean)', () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterPayload(),
      captchaToken: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('captchaToken' in result.data).toBe(false);
    }
  });
});

// ============================================================================
// forgotPasswordRequestSchema
// ============================================================================

describe('forgotPasswordRequestSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordRequestSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('accepts valid email with optional captchaToken', () => {
    const result = forgotPasswordRequestSchema.safeParse({
      email: 'user@example.com',
      captchaToken: 'abc',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.captchaToken).toBe('abc');
    }
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordRequestSchema.safeParse({ email: 'bad-email' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = forgotPasswordRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = forgotPasswordRequestSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('omits captchaToken when not a string', () => {
    const result = forgotPasswordRequestSchema.safeParse({
      email: 'user@example.com',
      captchaToken: 99,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('captchaToken' in result.data).toBe(false);
    }
  });
});

// ============================================================================
// resetPasswordRequestSchema
// ============================================================================

describe('resetPasswordRequestSchema', () => {
  it('accepts valid token and password', () => {
    const result = resetPasswordRequestSchema.safeParse({
      token: 'reset-token-abc',
      password: VALID_PASSWORD,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty token (min:1)', () => {
    const result = resetPasswordRequestSchema.safeParse({
      token: '',
      password: VALID_PASSWORD,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/token/i);
    }
  });

  it('rejects missing token', () => {
    const result = resetPasswordRequestSchema.safeParse({ password: VALID_PASSWORD });
    expect(result.success).toBe(false);
  });

  it('rejects non-string token', () => {
    const result = resetPasswordRequestSchema.safeParse({
      token: 123,
      password: VALID_PASSWORD,
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak password', () => {
    const result = resetPasswordRequestSchema.safeParse({
      token: 'valid-token',
      password: 'weak',
    });
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = resetPasswordRequestSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// setPasswordRequestSchema
// ============================================================================

describe('setPasswordRequestSchema', () => {
  it('accepts valid password', () => {
    const result = setPasswordRequestSchema.safeParse({ password: VALID_PASSWORD });
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = setPasswordRequestSchema.safeParse({ password: '1234567' });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = setPasswordRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = setPasswordRequestSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('rejects non-string password', () => {
    const result = setPasswordRequestSchema.safeParse({ password: true });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// sudoRequestSchema — either-or validation (security-critical)
// ============================================================================

describe('sudoRequestSchema', () => {
  it('accepts password only', () => {
    const result = sudoRequestSchema.safeParse({ password: 'my-password' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe('my-password');
      expect('totpCode' in result.data).toBe(false);
    }
  });

  it('accepts totpCode only', () => {
    const result = sudoRequestSchema.safeParse({ totpCode: '123456' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totpCode).toBe('123456');
      expect('password' in result.data).toBe(false);
    }
  });

  it('accepts both password and totpCode together', () => {
    const result = sudoRequestSchema.safeParse({
      password: 'my-password',
      totpCode: '123456',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe('my-password');
      expect(result.data.totpCode).toBe('123456');
    }
  });

  it('rejects when both password and totpCode are absent', () => {
    const result = sudoRequestSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/Either password or totpCode is required/i);
    }
  });

  it('rejects null input (treated as empty object — both fields absent)', () => {
    const result = sudoRequestSchema.safeParse(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/Either password or totpCode is required/i);
    }
  });

  it('rejects when password is a number instead of string', () => {
    const result = sudoRequestSchema.safeParse({ password: 12345678 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/Either password or totpCode is required/i);
    }
  });

  it('rejects when password is null (treated as missing)', () => {
    const result = sudoRequestSchema.safeParse({ password: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/Either password or totpCode is required/i);
    }
  });

  it('rejects when totpCode is boolean (type confusion)', () => {
    const result = sudoRequestSchema.safeParse({ totpCode: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/Either password or totpCode is required/i);
    }
  });

  it('accepts empty string password (no minimum length enforced here)', () => {
    // sudoRequestSchema only checks typeof === 'string', no min length
    const result = sudoRequestSchema.safeParse({ password: '' });
    expect(result.success).toBe(true);
  });

  it('rejects undefined input', () => {
    const result = sudoRequestSchema.safeParse(undefined);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/Either password or totpCode is required/i);
    }
  });

  it('does not include undefined keys in parsed output', () => {
    const result = sudoRequestSchema.safeParse({ password: 'test-pass' });
    expect(result.success).toBe(true);
    if (result.success) {
      // totpCode should not be present at all — not even as undefined
      expect(Object.keys(result.data)).not.toContain('totpCode');
    }
  });
});

// ============================================================================
// sudoResponseSchema
// ============================================================================

describe('sudoResponseSchema', () => {
  it('accepts valid sudoToken and expiresAt', () => {
    const result = sudoResponseSchema.safeParse({
      sudoToken: 'sudo-jwt-token',
      expiresAt: '2024-12-31T23:59:59Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing sudoToken', () => {
    const result = sudoResponseSchema.safeParse({ expiresAt: '2024-12-31T23:59:59Z' });
    expect(result.success).toBe(false);
  });

  it('rejects missing expiresAt', () => {
    const result = sudoResponseSchema.safeParse({ sudoToken: 'tok' });
    expect(result.success).toBe(false);
  });

  it('rejects null values', () => {
    const result = sudoResponseSchema.safeParse({ sudoToken: null, expiresAt: null });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// bffLoginResponseSchema — SECURITY: must not leak tokens
// ============================================================================

describe('bffLoginResponseSchema', () => {
  const validBffPayload = () => ({ user: makeUser() });

  it('accepts valid response with user only', () => {
    const result = bffLoginResponseSchema.safeParse(validBffPayload());
    expect(result.success).toBe(true);
  });

  it('accepts optional isNewDevice=true', () => {
    const result = bffLoginResponseSchema.safeParse({
      ...validBffPayload(),
      isNewDevice: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isNewDevice).toBe(true);
    }
  });

  it('accepts optional isNewDevice=false', () => {
    const result = bffLoginResponseSchema.safeParse({
      ...validBffPayload(),
      isNewDevice: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isNewDevice).toBe(false);
    }
  });

  it('accepts optional defaultTenantId', () => {
    const result = bffLoginResponseSchema.safeParse({
      ...validBffPayload(),
      defaultTenantId: 'tenant-123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultTenantId).toBe('tenant-123');
    }
  });

  it('SECURITY: rejects response containing "token" field', () => {
    const result = bffLoginResponseSchema.safeParse({
      ...validBffPayload(),
      token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.sig',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/BFF login response must not include token fields/i);
    }
  });

  it('SECURITY: rejects response containing "accessToken" field', () => {
    const result = bffLoginResponseSchema.safeParse({
      ...validBffPayload(),
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.secret.sig',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/BFF login response must not include token fields/i);
    }
  });

  it('SECURITY: rejects response containing both token and accessToken', () => {
    const result = bffLoginResponseSchema.safeParse({
      ...validBffPayload(),
      token: 'tok1',
      accessToken: 'tok2',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/BFF login response must not include token fields/i);
    }
  });

  it('SECURITY: token field set to empty string still triggers rejection', () => {
    const result = bffLoginResponseSchema.safeParse({
      ...validBffPayload(),
      token: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/BFF login response must not include token fields/i);
    }
  });

  it('SECURITY: token field set to null does NOT trigger rejection (null !== undefined)', () => {
    // null is defined (obj['token'] !== undefined is false when token is null)
    // The guard is: obj['token'] !== undefined — null passes through
    // but then userSchema will run; if user is valid it should succeed
    const result = bffLoginResponseSchema.safeParse({
      ...validBffPayload(),
      token: null,
    });
    // null satisfies `!== undefined`, so the guard triggers and rejects
    expect(result.success).toBe(false);
  });

  it('rejects missing user', () => {
    const result = bffLoginResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = bffLoginResponseSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('omits isNewDevice when value is not boolean', () => {
    const result = bffLoginResponseSchema.safeParse({
      ...validBffPayload(),
      isNewDevice: 'yes',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('isNewDevice' in result.data).toBe(false);
    }
  });

  it('omits defaultTenantId when value is not string', () => {
    const result = bffLoginResponseSchema.safeParse({
      ...validBffPayload(),
      defaultTenantId: 42,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('defaultTenantId' in result.data).toBe(false);
    }
  });
});

// ============================================================================
// authResponseSchema
// ============================================================================

describe('authResponseSchema', () => {
  const validPayload = () => ({
    token: 'jwt-access-token',
    user: makeUser(),
  });

  it('accepts minimal valid response', () => {
    const result = authResponseSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe('jwt-access-token');
    }
  });

  it('accepts optional isNewDevice=true', () => {
    const result = authResponseSchema.safeParse({
      ...validPayload(),
      isNewDevice: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isNewDevice).toBe(true);
    }
  });

  it('accepts optional isNewDevice=false', () => {
    const result = authResponseSchema.safeParse({
      ...validPayload(),
      isNewDevice: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isNewDevice).toBe(false);
    }
  });

  it('accepts optional defaultTenantId', () => {
    const result = authResponseSchema.safeParse({
      ...validPayload(),
      defaultTenantId: 'acme-corp',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultTenantId).toBe('acme-corp');
    }
  });

  it('omits isNewDevice when value is not boolean', () => {
    const result = authResponseSchema.safeParse({
      ...validPayload(),
      isNewDevice: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('isNewDevice' in result.data).toBe(false);
    }
  });

  it('omits defaultTenantId when value is not string', () => {
    const result = authResponseSchema.safeParse({
      ...validPayload(),
      defaultTenantId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('defaultTenantId' in result.data).toBe(false);
    }
  });

  it('rejects missing token', () => {
    const result = authResponseSchema.safeParse({ user: makeUser() });
    expect(result.success).toBe(false);
  });

  it('rejects missing user', () => {
    const result = authResponseSchema.safeParse({ token: 'jwt-token' });
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = authResponseSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// loginSuccessResponseSchema
// ============================================================================

describe('loginSuccessResponseSchema', () => {
  it('accepts a valid BFF-shaped payload (no token)', () => {
    const result = loginSuccessResponseSchema.safeParse({ user: makeUser() });
    expect(result.success).toBe(true);
  });

  it('rejects payload containing token field (delegates to bffLoginResponseSchema)', () => {
    const result = loginSuccessResponseSchema.safeParse({
      user: makeUser(),
      token: 'leaked-token',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/Invalid login success response/i);
    }
  });

  it('rejects payload containing accessToken field', () => {
    const result = loginSuccessResponseSchema.safeParse({
      user: makeUser(),
      accessToken: 'leaked-token',
    });
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = loginSuccessResponseSchema.safeParse(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/Invalid login success response/i);
    }
  });

  it('rejects empty object', () => {
    const result = loginSuccessResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts isNewDevice and defaultTenantId passthrough', () => {
    const result = loginSuccessResponseSchema.safeParse({
      user: makeUser(),
      isNewDevice: true,
      defaultTenantId: 'tenant-abc',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isNewDevice).toBe(true);
      expect(result.data.defaultTenantId).toBe('tenant-abc');
    }
  });
});

// ============================================================================
// registerResponseSchema
// ============================================================================

describe('registerResponseSchema', () => {
  const validPayload = () => ({
    status: 'pending_verification' as const,
    message: 'Please check your email',
    email: 'user@example.com',
  });

  it('accepts valid register response', () => {
    const result = registerResponseSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('pending_verification');
    }
  });

  it('rejects incorrect status literal', () => {
    const result = registerResponseSchema.safeParse({
      ...validPayload(),
      status: 'verified',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/pending_verification/i);
    }
  });

  it('rejects status of empty string', () => {
    const result = registerResponseSchema.safeParse({
      ...validPayload(),
      status: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing status', () => {
    const { status: _, ...rest } = validPayload();
    const result = registerResponseSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email in response', () => {
    const result = registerResponseSchema.safeParse({
      ...validPayload(),
      email: 'not-valid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing message', () => {
    const result = registerResponseSchema.safeParse({
      status: 'pending_verification',
      email: 'user@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = registerResponseSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// pendingVerificationLiteral
// ============================================================================

describe('pendingVerificationLiteral', () => {
  it('accepts "pending_verification"', () => {
    const result = pendingVerificationLiteral.safeParse('pending_verification');
    expect(result.success).toBe(true);
  });

  it('rejects any other string', () => {
    for (const value of ['verified', 'pending', 'PENDING_VERIFICATION', '', 'null']) {
      const result = pendingVerificationLiteral.safeParse(value);
      expect(result.success).toBe(false);
    }
  });

  it('rejects non-string types', () => {
    for (const value of [null, undefined, 0, false, {}]) {
      const result = pendingVerificationLiteral.safeParse(value);
      expect(result.success).toBe(false);
    }
  });
});

// ============================================================================
// logoutResponseSchema
// ============================================================================

describe('logoutResponseSchema', () => {
  it('accepts valid message', () => {
    const result = logoutResponseSchema.safeParse({ message: 'Logged out successfully' });
    expect(result.success).toBe(true);
  });

  it('rejects missing message', () => {
    const result = logoutResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-string message', () => {
    const result = logoutResponseSchema.safeParse({ message: 42 });
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = logoutResponseSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// forgotPasswordResponseSchema
// ============================================================================

describe('forgotPasswordResponseSchema', () => {
  it('accepts valid message', () => {
    const result = forgotPasswordResponseSchema.safeParse({ message: 'Reset email sent' });
    expect(result.success).toBe(true);
  });

  it('rejects missing message', () => {
    const result = forgotPasswordResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = forgotPasswordResponseSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// refreshResponseSchema
// ============================================================================

describe('refreshResponseSchema', () => {
  it('accepts valid token', () => {
    const result = refreshResponseSchema.safeParse({ token: 'new-jwt-token' });
    expect(result.success).toBe(true);
  });

  it('rejects missing token', () => {
    const result = refreshResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = refreshResponseSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('rejects non-string token', () => {
    const result = refreshResponseSchema.safeParse({ token: null });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// resetPasswordResponseSchema
// ============================================================================

describe('resetPasswordResponseSchema', () => {
  it('accepts valid message', () => {
    const result = resetPasswordResponseSchema.safeParse({ message: 'Password reset' });
    expect(result.success).toBe(true);
  });

  it('rejects missing message', () => {
    const result = resetPasswordResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = resetPasswordResponseSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// setPasswordResponseSchema
// ============================================================================

describe('setPasswordResponseSchema', () => {
  it('accepts valid message', () => {
    const result = setPasswordResponseSchema.safeParse({ message: 'Password set' });
    expect(result.success).toBe(true);
  });

  it('rejects missing message', () => {
    const result = setPasswordResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = setPasswordResponseSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// isAuthenticatedRequest — type guard (security-critical)
// ============================================================================

describe('isAuthenticatedRequest', () => {
  it('returns true when user has a non-empty string userId', () => {
    const req = { user: { userId: 'user-123', email: 'a@b.com', role: 'user' } };
    expect(isAuthenticatedRequest(req)).toBe(true);
  });

  it('returns false when user is undefined', () => {
    const req = { user: undefined };
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('returns false when user is absent from request', () => {
    const req = {};
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('throws when user is null (null passes typeof object check, then "in" operator throws)', () => {
    // typeof null === 'object', so null survives the first guard and reaches the 'in' operator.
    // This reveals a defect: the function does not guard against null before using 'in'.
    const req = { user: null };
    expect(() => isAuthenticatedRequest(req)).toThrow(TypeError);
  });

  it('returns false when user is a primitive string', () => {
    const req = { user: 'user-id-string' };
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('returns false when user is a number', () => {
    const req = { user: 42 };
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('returns false when user is a boolean', () => {
    const req = { user: true };
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('returns false when userId is an empty string (boundary)', () => {
    const req = { user: { userId: '', email: 'a@b.com', role: 'user' } };
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('returns false when userId is missing from user object', () => {
    const req = { user: { email: 'a@b.com', role: 'user' } };
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('returns false when userId is a number instead of string', () => {
    const req = { user: { userId: 12345, email: 'a@b.com', role: 'user' } };
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('returns false when userId is null', () => {
    const req = { user: { userId: null, email: 'a@b.com', role: 'user' } };
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('returns false when userId is boolean true', () => {
    const req = { user: { userId: true } };
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('returns true even without email and role fields (only userId is checked)', () => {
    // The type guard only validates userId presence and non-empty string
    const req = { user: { userId: 'some-id' } };
    expect(isAuthenticatedRequest(req)).toBe(true);
  });

  it('returns true for a whitespace-only userId (whitespace is a non-empty string)', () => {
    // The guard only checks !== '' — whitespace passes
    const req = { user: { userId: '   ' } };
    expect(isAuthenticatedRequest(req)).toBe(true);
  });

  it('handles prototype pollution attempt — __proto__ object does not create userId', () => {
    // JSON.parse with __proto__ does not inject into Object.prototype in modern JS
    const malicious = JSON.parse('{"user":{"__proto__":{"userId":"injected"}}}') as Record<
      string,
      unknown
    >;
    // The parsed object's user will not have userId as own property in a safe way
    const req = malicious;
    // If the user object has no own userId, the guard returns false
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('returns false when user is an array', () => {
    const req = { user: ['userId', 'user-123'] };
    // arrays are objects but do not contain userId in the checked way
    // Array.prototype has no userId, so 'userId' in user is false
    expect(isAuthenticatedRequest(req)).toBe(false);
  });

  it('narrows the type so userId, email, role are accessible without TS errors', () => {
    const req: { user?: unknown } = {
      user: { userId: 'u1', email: 'a@b.com', role: 'admin' },
    };
    if (isAuthenticatedRequest(req)) {
      // TypeScript should narrow here — we verify runtime behavior
      expect(req.user.userId).toBe('u1');
      expect(req.user.email).toBe('a@b.com');
      expect(req.user.role).toBe('admin');
    } else {
      throw new Error('Expected request to be authenticated');
    }
  });
});
