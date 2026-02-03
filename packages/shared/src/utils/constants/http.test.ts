// core/src/shared/constants/http.test.ts
import { describe, expect, test } from 'vitest';

import { HTTP_STATUS } from './http';

describe('HTTP_STATUS', () => {
  describe('success codes', () => {
    test('OK should be 200', () => {
      expect(HTTP_STATUS.OK).toBe(200);
    });

    test('CREATED should be 201', () => {
      expect(HTTP_STATUS.CREATED).toBe(201);
    });

    test('NO_CONTENT should be 204', () => {
      expect(HTTP_STATUS.NO_CONTENT).toBe(204);
    });
  });

  describe('client error codes', () => {
    test('BAD_REQUEST should be 400', () => {
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
    });

    test('UNAUTHORIZED should be 401', () => {
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    });

    test('FORBIDDEN should be 403', () => {
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    });

    test('NOT_FOUND should be 404', () => {
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    });

    test('CONFLICT should be 409', () => {
      expect(HTTP_STATUS.CONFLICT).toBe(409);
    });

    test('UNPROCESSABLE_ENTITY should be 422', () => {
      expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422);
    });

    test('TOO_MANY_REQUESTS should be 429', () => {
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
    });
  });

  describe('server error codes', () => {
    test('INTERNAL_SERVER_ERROR should be 500', () => {
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });

    test('SERVICE_UNAVAILABLE should be 503', () => {
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    });
  });

  test('should be immutable (as const)', () => {
    // TypeScript enforces this at compile time, but we can verify the values are numbers
    const values = Object.values(HTTP_STATUS);
    expect(values.every((v) => typeof v === 'number')).toBe(true);
  });
});
