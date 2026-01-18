// packages/tests/src/mocks/user.ts
/**
 * Mock User Factory
 *
 * Creates mock user objects for testing.
 */

/**
 * User role type
 */
export type UserRole = 'user' | 'admin' | 'moderator';

/**
 * Base user interface for mocks
 */
export interface MockUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * User with password for auth testing
 */
export interface MockUserWithPassword extends MockUser {
  passwordHash: string;
  emailVerified: boolean;
}

/**
 * Default mock user values
 */
const DEFAULT_USER: MockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

/**
 * Create a mock user with optional overrides
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    ...DEFAULT_USER,
    ...overrides,
  };
}

/**
 * Create a mock user with password hash
 */
export function createMockUserWithPassword(
  overrides?: Partial<MockUserWithPassword>,
): MockUserWithPassword {
  return {
    ...DEFAULT_USER,
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$mock-hash',
    emailVerified: true,
    ...overrides,
  };
}

/**
 * Create a mock admin user
 */
export function createMockAdmin(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    ...overrides,
  });
}

/**
 * Create multiple mock users
 */
export function createMockUsers(count: number, overrides?: Partial<MockUser>): MockUser[] {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      id: `user-${String(i + 1)}`,
      email: `user${String(i + 1)}@example.com`,
      name: `User ${String(i + 1)}`,
      ...overrides,
    }),
  );
}
