// apps/server/src/shared/__tests__/constants.test.ts
import {
  CSRF_COOKIE_NAME,
  DAYS_PER_WEEK,
  ERROR_MESSAGES,
  FAILURE_REASONS,
  HOURS_PER_DAY,
  HTTP_STATUS,
  MAX_PROGRESSIVE_DELAY_MS,
  MIN_JWT_SECRET_LENGTH,
  MINUTES_PER_HOUR,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  PROGRESSIVE_DELAY_WINDOW_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_BYTES,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  SUCCESS_MESSAGES,
} from '@shared/constants';
import { describe, expect, test } from 'vitest';

describe('Shared Constants', () => {
  describe('Time Constants', () => {
    test('should have correct base time constants', () => {
      expect(MS_PER_SECOND).toBe(1000);
      expect(SECONDS_PER_MINUTE).toBe(60);
      expect(MINUTES_PER_HOUR).toBe(60);
      expect(HOURS_PER_DAY).toBe(24);
      expect(DAYS_PER_WEEK).toBe(7);
    });

    test('should have correctly derived time constants', () => {
      expect(MS_PER_MINUTE).toBe(60000);
      expect(MS_PER_HOUR).toBe(3600000);
      expect(MS_PER_DAY).toBe(86400000);
      expect(SECONDS_PER_HOUR).toBe(3600);
      expect(SECONDS_PER_DAY).toBe(86400);
    });
  });

  describe('Security Constants', () => {
    test('should have minimum JWT secret length', () => {
      expect(MIN_JWT_SECRET_LENGTH).toBe(32);
    });

    test('should have refresh token bytes', () => {
      expect(REFRESH_TOKEN_BYTES).toBe(64);
    });

    test('should have progressive delay constants', () => {
      expect(PROGRESSIVE_DELAY_WINDOW_MS).toBe(5 * 60 * 1000);
      expect(MAX_PROGRESSIVE_DELAY_MS).toBe(30 * 1000);
    });
  });

  describe('Cookie Names', () => {
    test('should have correct cookie names', () => {
      expect(REFRESH_COOKIE_NAME).toBe('refreshToken');
      expect(CSRF_COOKIE_NAME).toBe('_csrf');
    });
  });

  describe('HTTP Status Codes', () => {
    test('should have correct success status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.NO_CONTENT).toBe(204);
    });

    test('should have correct client error status codes', () => {
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.CONFLICT).toBe(409);
      expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
    });

    test('should have correct server error status codes', () => {
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    });
  });

  describe('Error Messages', () => {
    test('should have general error messages', () => {
      expect(ERROR_MESSAGES.INTERNAL_ERROR).toBe('Internal server error');
      expect(ERROR_MESSAGES.NOT_FOUND).toBe('Resource not found');
      expect(ERROR_MESSAGES.BAD_REQUEST).toBe('Bad request');
    });

    test('should have authentication error messages', () => {
      expect(ERROR_MESSAGES.INVALID_CREDENTIALS).toBe('Invalid email or password');
      expect(ERROR_MESSAGES.UNAUTHORIZED).toBe('Unauthorized');
      expect(ERROR_MESSAGES.FORBIDDEN).toBe('Forbidden - insufficient permissions');
    });
  });

  describe('Success Messages', () => {
    test('should have success messages', () => {
      expect(SUCCESS_MESSAGES.LOGGED_OUT).toBe('Logged out successfully');
      expect(SUCCESS_MESSAGES.ACCOUNT_UNLOCKED).toBe('Account unlocked successfully');
    });
  });

  describe('Failure Reasons', () => {
    test('should have failure reason constants', () => {
      expect(FAILURE_REASONS.ACCOUNT_LOCKED).toBe('Account locked');
      expect(FAILURE_REASONS.USER_NOT_FOUND).toBe('User not found');
      expect(FAILURE_REASONS.INVALID_PASSWORD).toBe('Invalid password');
      expect(FAILURE_REASONS.TOKEN_EXPIRED).toBe('Token expired');
    });
  });
});
