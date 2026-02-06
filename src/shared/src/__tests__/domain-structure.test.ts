// packages/shared/src/__tests__/domain-structure.test.ts
import { describe, expect, test } from 'vitest';

// Test domain exports for the new domain-based structure
describe('Domain Structure', () => {
  describe('Auth Domain', () => {
    test('should export password validation from domain barrel', async () => {
      const { validatePassword } = await import('../domain/auth/index.js');

      expect(typeof validatePassword).toBe('function');
    });

    test('should export password config and helpers from auth.password', async () => {
      const { defaultPasswordConfig, validatePasswordBasic, getStrengthLabel, getStrengthColor } =
        await import('../domain/auth/auth.password.js');

      expect(typeof defaultPasswordConfig).toBe('object');
      expect(typeof validatePasswordBasic).toBe('function');
      expect(typeof getStrengthLabel).toBe('function');
      expect(typeof getStrengthColor).toBe('function');
    });

    test('should export password strength estimation', async () => {
      const { estimatePasswordStrength } = await import('../domain/auth/auth.password-strength.js');

      expect(typeof estimatePasswordStrength).toBe('function');
    });

    test('should export auth errors from core', async () => {
      const {
        InvalidCredentialsError,
        InvalidTokenError,
        TokenReuseError,
        WeakPasswordError,
        EmailAlreadyExistsError,
        EmailNotVerifiedError,
        UserNotFoundError,
        OAuthError,
        OAuthStateMismatchError,
        TotpRequiredError,
        TotpInvalidError,
      } = await import('../core/errors.js');

      // Test that they are error classes by checking they extend Error
      expect(new InvalidCredentialsError()).toBeInstanceOf(Error);
      expect(new InvalidTokenError()).toBeInstanceOf(Error);
      expect(new TokenReuseError()).toBeInstanceOf(Error);
      expect(new WeakPasswordError()).toBeInstanceOf(Error);
      expect(new EmailAlreadyExistsError()).toBeInstanceOf(Error);
      expect(new EmailNotVerifiedError('test@example.com')).toBeInstanceOf(Error);
      expect(new UserNotFoundError()).toBeInstanceOf(Error);
      expect(new OAuthError('msg', 'google')).toBeInstanceOf(Error);
      expect(new OAuthStateMismatchError('google')).toBeInstanceOf(Error);
      expect(new TotpRequiredError()).toBeInstanceOf(Error);
      expect(new TotpInvalidError()).toBeInstanceOf(Error);
    });

    test('should export auth-specific errors from domain', async () => {
      const { AccountLockedError, EmailSendError } = await import('../domain/auth/index.js');

      expect(new AccountLockedError()).toBeInstanceOf(Error);
      expect(new EmailSendError()).toBeInstanceOf(Error);
    });
  });

  describe('Contracts', () => {
    test('should export auth schemas from contracts', async () => {
      const { authContract, loginRequestSchema, registerRequestSchema, authResponseSchema } =
        await import('../contracts/index.js');

      expect(typeof authContract).toBe('object');
      expect(typeof loginRequestSchema).toBe('object');
      expect(typeof registerRequestSchema).toBe('object');
      expect(typeof authResponseSchema).toBe('object');
    });

    test('should export user types and schemas from contracts', async () => {
      const { userSchema, userRoleSchema, usersContract } = await import('../contracts/index.js');

      expect(typeof userSchema).toBe('object');
      expect(typeof userRoleSchema).toBe('object');
      expect(typeof usersContract).toBe('object');
    });

    test('should export admin schemas from contracts', async () => {
      const { adminContract, unlockAccountRequestSchema, unlockAccountResponseSchema } =
        await import('../contracts/index.js');

      expect(typeof adminContract).toBe('object');
      expect(typeof unlockAccountRequestSchema).toBe('object');
      expect(typeof unlockAccountResponseSchema).toBe('object');
    });
  });

  describe('Pagination Domain', () => {
    test('should export pagination utilities', async () => {
      const { encodeCursor, decodeCursor, buildCursorPaginationQuery, paginateArrayWithCursor } =
        await import('../utils/pagination/index.js');

      const { PaginationError } = await import('../utils/pagination.js');

      expect(typeof encodeCursor).toBe('function');
      expect(typeof decodeCursor).toBe('function');
      expect(typeof PaginationError).toBe('function');
      expect(typeof buildCursorPaginationQuery).toBe('function');
      expect(typeof paginateArrayWithCursor).toBe('function');
    });
  });

  describe('Infrastructure Layer', () => {
    test('should export async utilities', async () => {
      const { BatchedQueue, DeferredPromise, ReactiveMap } =
        await import('../utils/async/index.js');

      expect(typeof BatchedQueue).toBe('function');
      expect(typeof DeferredPromise).toBe('function');
      expect(typeof ReactiveMap).toBe('function');
    });

    test('should export HTTP utilities', async () => {
      const { parseCookies } = await import('../utils/http.js');

      expect(typeof parseCookies).toBe('function');
    });

    // State management has been moved to @abe-stack/stores package

    test('should export transaction utilities', async () => {
      const {
        createListInsertOperation,
        createListRemoveOperation,
        createSetOperation,
        createTransaction,
        invertOperation,
        invertTransaction,
        isListInsertOperation,
        isListRemoveOperation,
        isSetOperation,
        mergeTransactions,
      } = await import('../core/transactions/index.js');

      expect(typeof createListInsertOperation).toBe('function');
      expect(typeof createListRemoveOperation).toBe('function');
      expect(typeof createSetOperation).toBe('function');
      expect(typeof createTransaction).toBe('function');
      expect(typeof invertOperation).toBe('function');
      expect(typeof invertTransaction).toBe('function');
      expect(typeof isListInsertOperation).toBe('function');
      expect(typeof isListRemoveOperation).toBe('function');
      expect(typeof isSetOperation).toBe('function');
      expect(typeof mergeTransactions).toBe('function');
    });

    test('should export base errors and helpers', async () => {
      const { AppError, ValidationError, isAppError, toAppError } =
        await import('../core/errors.js');

      expect(typeof AppError).toBe('function');
      expect(typeof ValidationError).toBe('function');
      expect(typeof isAppError).toBe('function');
      expect(typeof toAppError).toBe('function');

      expect(new AppError('test')).toBeInstanceOf(Error);
      expect(new ValidationError('test', {})).toBeInstanceOf(Error);
    });

    test('should export HTTP errors', async () => {
      const {
        BadRequestError,
        UnauthorizedError,
        ForbiddenError,
        NotFoundError,
        ConflictError,
        TooManyRequestsError,
        InternalServerError,
      } = await import('../core/errors.js');

      expect(typeof BadRequestError).toBe('function');
      expect(typeof UnauthorizedError).toBe('function');
      expect(typeof ForbiddenError).toBe('function');
      expect(typeof NotFoundError).toBe('function');
      expect(typeof ConflictError).toBe('function');
      expect(typeof TooManyRequestsError).toBe('function');
      expect(typeof InternalServerError).toBe('function');

      // Test that they create proper error instances
      expect(new BadRequestError()).toBeInstanceOf(Error);
      expect(new UnauthorizedError()).toBeInstanceOf(Error);
      expect(new ForbiddenError()).toBeInstanceOf(Error);
      expect(new NotFoundError()).toBeInstanceOf(Error);
      expect(new ConflictError()).toBeInstanceOf(Error);
      expect(new TooManyRequestsError()).toBeInstanceOf(Error);
      expect(new InternalServerError()).toBeInstanceOf(Error);
    });

    test('should export constants', async () => {
      const {
        HTTP_STATUS,
        MS_PER_SECOND,
        SECONDS_PER_MINUTE,
        MINUTES_PER_HOUR,
        HOURS_PER_DAY,
        DAYS_PER_WEEK,
      } = await import('../utils/constants/index.js');

      expect(typeof HTTP_STATUS).toBe('object');
      expect(typeof MS_PER_SECOND).toBe('number');
      expect(typeof SECONDS_PER_MINUTE).toBe('number');
      expect(typeof MINUTES_PER_HOUR).toBe('number');
      expect(typeof HOURS_PER_DAY).toBe('number');
      expect(typeof DAYS_PER_WEEK).toBe('number');
    });

    test('should export crypto utilities', async () => {
      const { sign, decode, verify } = await import('../utils/jwt.js');

      expect(typeof sign).toBe('function');
      expect(typeof decode).toBe('function');
      expect(typeof verify).toBe('function');
    });
  });

  describe('Main Package Exports', () => {
    test('should export environment validation via core', async () => {
      const { baseEnvSchema, validateEnv, getRawEnv } = await import('../core/env.js');

      expect(typeof baseEnvSchema).toBe('object');
      expect(typeof validateEnv).toBe('function');
      expect(typeof getRawEnv).toBe('function');
    });

    test('should export domain utilities via main index', async () => {
      const mainIndex = await import('../index.js');

      // Core errors and utilities (from export * from './core')
      expect(typeof mainIndex.HTTP_STATUS).toBe('object');
      expect(typeof mainIndex.AppError).toBe('function');
      expect(typeof mainIndex.BadRequestError).toBe('function');
      expect(typeof mainIndex.isAppError).toBe('function');

      // Auth domain (from export * from './domain')
      expect(typeof mainIndex.authContract).toBe('object');

      // Contracts namespace (from export * as Contracts)
      expect(typeof mainIndex.Contracts).toBe('object');
      expect(typeof mainIndex.Contracts.userRoleSchema).toBe('object');

      // Types namespace (from export * as Types)
      expect(typeof mainIndex.Types).toBe('object');
    }, 15_000);
  });

  describe('Backward Compatibility', () => {
    test('should maintain existing import patterns', async () => {
      // This simulates how the server imports from @abe-stack/shared
      const core = await import('../index.js');

      // Core errors and utilities available at top level
      expect(typeof core.AppError).toBe('function');
      expect(typeof core.BadRequestError).toBe('function');
      expect(typeof core.HTTP_STATUS).toBe('object');

      // Domain exports (auth, billing, etc.) flattened at top level
      expect(typeof core.authContract).toBe('object');

      // Utils are NOT at top level (Node-only code) - use subpath imports
      // e.g., import { parseCookies } from '@abe-stack/shared/utils'
    });
  });
});
