// packages/tests/src/constants/index.ts
/**
 * Test Constants
 *
 * Shared constants for testing across packages.
 */

/**
 * Test user credentials
 */
export const TEST_USER = {
  id: 'user-123',
  email: 'test@example.com',
  password: 'StrongPassword123!',
  name: 'Test User',
} as const;

export const TEST_ADMIN = {
  id: 'admin-123',
  email: 'admin@example.com',
  password: 'AdminPassword123!',
  name: 'Admin User',
} as const;

/**
 * Test tokens
 */
export const TEST_TOKENS = {
  accessToken: 'mock-access-token-abc123',
  refreshToken: 'mock-refresh-token-xyz789',
  expiredToken: 'mock-expired-token-000',
  invalidToken: 'invalid-token',
} as const;

/**
 * Test JWT configuration
 */
export const TEST_JWT_CONFIG = {
  secret: 'test-secret-32-characters-long!!',
  expiresIn: '15m',
} as const;

/**
 * Test Argon2 configuration (faster for tests)
 */
export const TEST_ARGON2_CONFIG = {
  memoryCost: 1024, // Lower for faster tests
  timeCost: 1,
  parallelism: 1,
} as const;

/**
 * Test database IDs
 */
export const TEST_IDS = {
  userId: 'user-123',
  adminId: 'admin-123',
  tokenId: 'token-456',
  familyId: 'family-789',
  sessionId: 'session-abc',
} as const;

/**
 * Test timestamps
 */
export const TEST_DATES = {
  now: new Date('2024-01-15T12:00:00.000Z'),
  past: new Date('2024-01-01T00:00:00.000Z'),
  future: new Date('2024-12-31T23:59:59.999Z'),
  expired: new Date('2023-01-01T00:00:00.000Z'),
} as const;

/**
 * Test cookie names (matching server constants)
 */
export const TEST_COOKIE_NAMES = {
  refresh: 'refresh_token',
  csrf: 'csrf_token',
} as const;

/**
 * Test error messages
 */
export const TEST_ERROR_MESSAGES = {
  unauthorized: 'Unauthorized',
  forbidden: 'Forbidden',
  notFound: 'Not found',
  invalidCredentials: 'Invalid email or password',
  emailExists: 'Email already registered',
  weakPassword: 'Password is too weak',
  invalidToken: 'Invalid or expired token',
  accountLocked: 'Account temporarily locked',
} as const;
