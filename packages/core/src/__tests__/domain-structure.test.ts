// packages/core/src/__tests__/domain-structure.test.ts
import { describe, expect, test } from 'vitest';

// Test domain exports for the new domain-based structure
describe('Domain Structure', () => {
  describe('Auth Domain', () => {
    test('should export password validation functions', async () => {
      const {
        defaultPasswordConfig,
        validatePassword,
        validatePasswordBasic,
        getStrengthLabel,
        getStrengthColor,
        estimatePasswordStrength,
      } = await import('../modules/auth/index.js');

      expect(typeof defaultPasswordConfig).toBe('object');
      expect(typeof validatePassword).toBe('function');
      expect(typeof validatePasswordBasic).toBe('function');
      expect(typeof getStrengthLabel).toBe('function');
      expect(typeof getStrengthColor).toBe('function');
      expect(typeof estimatePasswordStrength).toBe('function');
    });

    test('should export auth errors', async () => {
      const {
        InvalidCredentialsError,
        AccountLockedError,
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
      } = await import('../modules/auth/index.js');

      // Test that they are error classes by checking they extend Error
      expect(new InvalidCredentialsError()).toBeInstanceOf(Error);
      expect(new AccountLockedError()).toBeInstanceOf(Error);
      expect(new InvalidTokenError()).toBeInstanceOf(Error);
      expect(new TokenReuseError()).toBeInstanceOf(Error);
      expect(new WeakPasswordError()).toBeInstanceOf(Error);
      expect(new EmailAlreadyExistsError()).toBeInstanceOf(Error);
      expect(new EmailNotVerifiedError()).toBeInstanceOf(Error);
      expect(new UserNotFoundError()).toBeInstanceOf(Error);
      expect(new OAuthError('msg', 'google')).toBeInstanceOf(Error);
      expect(new OAuthStateMismatchError('google')).toBeInstanceOf(Error);
      expect(new TotpRequiredError()).toBeInstanceOf(Error);
      expect(new TotpInvalidError()).toBeInstanceOf(Error);
    });
  });

  describe('Contracts', () => {
    test('should export auth schemas from contracts', async () => {
      const { authContract, loginRequestSchema, registerRequestSchema, authResponseSchema } =
        await import('@abe-stack/contracts/index.js');

      expect(typeof authContract).toBe('object');
      expect(typeof loginRequestSchema).toBe('object');
      expect(typeof registerRequestSchema).toBe('object');
      expect(typeof authResponseSchema).toBe('object');
    });

    test('should export user types and schemas from contracts', async () => {
      const { userSchema, userRoleSchema, usersContract } =
        await import('@abe-stack/contracts/index.js');

      expect(typeof userSchema).toBe('object');
      expect(typeof userRoleSchema).toBe('object');
      expect(typeof usersContract).toBe('object');
    });

    test('should export admin schemas from contracts', async () => {
      const { adminContract, unlockAccountRequestSchema, unlockAccountResponseSchema } =
        await import('@abe-stack/contracts/index.js');

      expect(typeof adminContract).toBe('object');
      expect(typeof unlockAccountRequestSchema).toBe('object');
      expect(typeof unlockAccountResponseSchema).toBe('object');
    });
  });

  describe('Pagination Domain', () => {
    test('should export pagination utilities', async () => {
      const {
        encodeCursor,
        decodeCursor,
        PaginationError,
        buildCursorPaginationQuery,
        paginateArrayWithCursor,
      } = await import('../modules/pagination/index.js');

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
        await import('../infrastructure/async/index.js');

      expect(typeof BatchedQueue).toBe('function');
      expect(typeof DeferredPromise).toBe('function');
      expect(typeof ReactiveMap).toBe('function');
    });

    test('should export HTTP utilities', async () => {
      const { parseCookies } = await import('../infrastructure/http/index.js');

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
      } = await import('../infrastructure/transactions/index.js');

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
        await import('../infrastructure/errors/index.js');

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
        InternalError,
      } = await import('../infrastructure/errors/index.js');

      expect(typeof BadRequestError).toBe('function');
      expect(typeof UnauthorizedError).toBe('function');
      expect(typeof ForbiddenError).toBe('function');
      expect(typeof NotFoundError).toBe('function');
      expect(typeof ConflictError).toBe('function');
      expect(typeof TooManyRequestsError).toBe('function');
      expect(typeof InternalError).toBe('function');

      // Test that they create proper error instances
      expect(new BadRequestError()).toBeInstanceOf(Error);
      expect(new UnauthorizedError()).toBeInstanceOf(Error);
      expect(new ForbiddenError()).toBeInstanceOf(Error);
      expect(new NotFoundError()).toBeInstanceOf(Error);
      expect(new ConflictError()).toBeInstanceOf(Error);
      expect(new TooManyRequestsError()).toBeInstanceOf(Error);
      expect(new InternalError()).toBeInstanceOf(Error);
    });

    test('should export constants', async () => {
      const {
        HTTP_STATUS,
        MS_PER_SECOND,
        SECONDS_PER_MINUTE,
        MINUTES_PER_HOUR,
        HOURS_PER_DAY,
        DAYS_PER_WEEK,
      } = await import('../shared/constants/index.js');

      expect(typeof HTTP_STATUS).toBe('object');
      expect(typeof MS_PER_SECOND).toBe('number');
      expect(typeof SECONDS_PER_MINUTE).toBe('number');
      expect(typeof MINUTES_PER_HOUR).toBe('number');
      expect(typeof HOURS_PER_DAY).toBe('number');
      expect(typeof DAYS_PER_WEEK).toBe('number');
    });

    test('should export crypto utilities', async () => {
      const { sign, decode, verify } = await import('../infrastructure/crypto/index.js');

      expect(typeof sign).toBe('function');
      expect(typeof decode).toBe('function');
      expect(typeof verify).toBe('function');
    });
  });

  describe('Main Package Exports', () => {
    test('should export environment validation via subpath', async () => {
      // Server-only env utils are in subpath export @abe-stack/core/env
      const {
        validateEnvironment,
        validateEnvironmentSafe,
        validateDatabaseEnv,
        validateSecurityEnv,
        validateStorageEnv,
        validateEmailEnv,
        validateDevelopmentEnv,
        validateProductionEnv,
        getEnvValidator,
        envSchema,
      } = await import('../env.js');

      expect(typeof validateEnvironment).toBe('function');
      expect(typeof validateEnvironmentSafe).toBe('function');
      expect(typeof validateDatabaseEnv).toBe('function');
      expect(typeof validateSecurityEnv).toBe('function');
      expect(typeof validateStorageEnv).toBe('function');
      expect(typeof validateEmailEnv).toBe('function');
      expect(typeof validateDevelopmentEnv).toBe('function');
      expect(typeof validateProductionEnv).toBe('function');
      expect(typeof getEnvValidator).toBe('function');
      expect(typeof envSchema).toBe('object');
    });

    test('should export domain utilities via main index', async () => {
      const {
        // Auth domain
        validatePassword,
        InvalidCredentialsError,

        // Infrastructure
        HTTP_STATUS,
        BatchedQueue,
        parseCookies,
        AppError,
        BadRequestError,
        isAppError,

        // Domains
        userRoleSchema,
        authContract,
      } = await import('../index.js');

      // Auth domain
      expect(typeof validatePassword).toBe('function');
      expect(typeof InvalidCredentialsError).toBe('function');

      // Infrastructure (state management moved to @abe-stack/stores)
      expect(typeof HTTP_STATUS).toBe('object');
      expect(typeof BatchedQueue).toBe('function');
      expect(typeof parseCookies).toBe('function');
      expect(typeof AppError).toBe('function');
      expect(typeof BadRequestError).toBe('function');
      expect(typeof isAppError).toBe('function');

      // Domains
      expect(typeof userRoleSchema).toBe('object');
      expect(typeof authContract).toBe('object');
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain existing import patterns', async () => {
      // This simulates how the server imports from @abe-stack/core
      const core = await import('../index.js');

      // Common imports that should still work
      expect(typeof core.validatePassword).toBe('function');
      expect(typeof core.InvalidCredentialsError).toBe('function');
      expect(typeof core.AppError).toBe('function');
      expect(typeof core.BadRequestError).toBe('function');
      expect(typeof core.HTTP_STATUS).toBe('object');
      expect(typeof core.userRoleSchema).toBe('object');
      expect(typeof core.authContract).toBe('object');
    });
  });
});
