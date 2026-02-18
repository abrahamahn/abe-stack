// main/shared/src/api/response.test.ts
import { describe, expect, it } from 'vitest';

import {
  apiResultSchema,
  createErrorCodeSchema,
  emptyBodySchema,
  envelopeErrorResponseSchema,
  errorCodeSchema,
  errorResponseSchema,
  simpleErrorResponseSchema,
  successResponseSchema,
  type ApiResultEnvelope,
  type EmptyBody,
  type ErrorResponse,
  type ErrorResponseEnvelope,
  type SuccessResponseEnvelope,
} from './response';

import { createSchema } from '../primitives/schema';

// ============================================================================
// successResponseSchema
// ============================================================================

describe('successResponseSchema', () => {
  const stringSchema = createSchema((data: unknown) => {
    if (typeof data !== 'string') throw new Error('must be a string');
    return data;
  });

  describe('happy path', () => {
    it('parses a valid success envelope', () => {
      const result: SuccessResponseEnvelope<string> = successResponseSchema(stringSchema).parse({
        ok: true,
        data: 'hello',
      });

      expect(result.ok).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('parses a success envelope with object data', () => {
      const objSchema = createSchema((data: unknown) => {
        if (typeof data !== 'object' || data === null) throw new Error('must be an object');
        return data as { id: string };
      });

      const result: SuccessResponseEnvelope<{ id: string }> = successResponseSchema(objSchema).parse(
        { ok: true, data: { id: 'abc' } },
      );

      expect(result.data).toEqual({ id: 'abc' });
    });
  });

  describe('adversarial inputs', () => {
    it('throws when ok is false', () => {
      expect(() =>
        successResponseSchema(stringSchema).parse({ ok: false, data: 'hello' }),
      ).toThrow('Expected ok to be true');
    });

    it('throws when ok is missing', () => {
      expect(() =>
        successResponseSchema(stringSchema).parse({ data: 'hello' }),
      ).toThrow('Expected ok to be true');
    });

    it('throws when ok is truthy but not exactly true', () => {
      expect(() =>
        successResponseSchema(stringSchema).parse({ ok: 1, data: 'hello' }),
      ).toThrow('Expected ok to be true');
    });

    it('throws when data fails inner schema validation', () => {
      expect(() =>
        successResponseSchema(stringSchema).parse({ ok: true, data: 42 }),
      ).toThrow('must be a string');
    });

    it('throws when input is null', () => {
      expect(() =>
        successResponseSchema(stringSchema).parse(null),
      ).toThrow('Expected ok to be true');
    });

    it('throws when input is a non-object primitive', () => {
      expect(() =>
        successResponseSchema(stringSchema).parse('not-an-object'),
      ).toThrow('Expected ok to be true');
    });

    it('throws when input is an array', () => {
      expect(() =>
        successResponseSchema(stringSchema).parse([]),
      ).toThrow('Expected ok to be true');
    });
  });
});

// ============================================================================
// envelopeErrorResponseSchema
// ============================================================================

describe('envelopeErrorResponseSchema', () => {
  describe('happy path', () => {
    it('parses a minimal error envelope', () => {
      const result: ErrorResponseEnvelope = envelopeErrorResponseSchema.parse({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      });

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.message).toBe('Resource not found');
    });

    it('parses error envelope with details field', () => {
      const result: ErrorResponseEnvelope = envelopeErrorResponseSchema.parse({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Bad input', details: { field: 'email' } },
      });

      expect(result.error.details).toEqual({ field: 'email' });
    });

    it('errorResponseSchema is an alias for envelopeErrorResponseSchema', () => {
      const input = { ok: false, error: { code: 'ERR', message: 'oops' } };
      const a = envelopeErrorResponseSchema.parse(input);
      const b = errorResponseSchema.parse(input);
      expect(a).toEqual(b);
    });
  });

  describe('adversarial inputs', () => {
    it('throws when ok is true instead of false', () => {
      expect(() =>
        envelopeErrorResponseSchema.parse({ ok: true, error: { code: 'E', message: 'm' } }),
      ).toThrow('Expected ok to be false');
    });

    it('throws when ok is missing', () => {
      expect(() =>
        envelopeErrorResponseSchema.parse({ error: { code: 'E', message: 'm' } }),
      ).toThrow('Expected ok to be false');
    });

    it('throws when error.code is not a string', () => {
      expect(() =>
        envelopeErrorResponseSchema.parse({ ok: false, error: { code: 42, message: 'err' } }),
      ).toThrow('Error code must be a string');
    });

    it('throws when error.message is not a string', () => {
      expect(() =>
        envelopeErrorResponseSchema.parse({ ok: false, error: { code: 'E', message: null } }),
      ).toThrow('Error message must be a string');
    });

    it('throws when error field is missing entirely', () => {
      expect(() =>
        envelopeErrorResponseSchema.parse({ ok: false }),
      ).toThrow('Error code must be a string');
    });

    it('throws when error is a primitive, not an object', () => {
      expect(() =>
        envelopeErrorResponseSchema.parse({ ok: false, error: 'bad' }),
      ).toThrow('Error code must be a string');
    });

    it('throws when input is null', () => {
      expect(() =>
        envelopeErrorResponseSchema.parse(null),
      ).toThrow('Expected ok to be false');
    });

    it('throws when code is empty string (does not throw — schema accepts empty strings)', () => {
      // Boundary: schema does not enforce non-empty code; empty string is a valid string
      const result = envelopeErrorResponseSchema.parse({
        ok: false,
        error: { code: '', message: 'err' },
      });
      expect(result.error.code).toBe('');
    });

    it('throws when error is an array instead of object', () => {
      expect(() =>
        envelopeErrorResponseSchema.parse({ ok: false, error: ['code', 'msg'] }),
      ).toThrow('Error code must be a string');
    });
  });
});

// ============================================================================
// apiResultSchema
// ============================================================================

describe('apiResultSchema', () => {
  const numSchema = createSchema((data: unknown) => {
    if (typeof data !== 'number') throw new Error('must be a number');
    return data;
  });

  describe('happy path', () => {
    it('routes to success schema when ok is true', () => {
      const result: ApiResultEnvelope<number> = apiResultSchema(numSchema).parse({
        ok: true,
        data: 7,
      });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe(7);
    });

    it('routes to error schema when ok is false', () => {
      const result: ApiResultEnvelope<number> = apiResultSchema(numSchema).parse({
        ok: false,
        error: { code: 'FAIL', message: 'went wrong' },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('FAIL');
    });
  });

  describe('adversarial inputs', () => {
    it('throws when ok is true but data fails inner schema', () => {
      expect(() =>
        apiResultSchema(numSchema).parse({ ok: true, data: 'not-a-number' }),
      ).toThrow('must be a number');
    });

    it('throws when ok is false but error.code is missing', () => {
      expect(() =>
        apiResultSchema(numSchema).parse({ ok: false, error: { message: 'oops' } }),
      ).toThrow('Error code must be a string');
    });

    it('throws when input is null', () => {
      expect(() => apiResultSchema(numSchema).parse(null)).toThrow();
    });

    it('throws when ok is neither true nor false (treated as error path)', () => {
      // ok !== true → goes to error schema → throws because error.code is missing
      expect(() =>
        apiResultSchema(numSchema).parse({ ok: 'yes', data: 1 }),
      ).toThrow();
    });
  });
});

// ============================================================================
// simpleErrorResponseSchema
// ============================================================================

describe('simpleErrorResponseSchema', () => {
  describe('happy path', () => {
    it('parses minimal error with just message', () => {
      const result: ErrorResponse = simpleErrorResponseSchema.parse({ message: 'Something broke' });

      expect(result.message).toBe('Something broke');
      expect(result.code).toBeUndefined();
      expect(result.details).toBeUndefined();
    });

    it('parses full error with code and details', () => {
      const result: ErrorResponse = simpleErrorResponseSchema.parse({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'email', reason: 'invalid format' },
      });

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.details).toEqual({ field: 'email', reason: 'invalid format' });
    });

    it('omits code when it is not a string', () => {
      const result: ErrorResponse = simpleErrorResponseSchema.parse({ message: 'err', code: 42 });
      expect(result.code).toBeUndefined();
    });

    it('omits details when it is a primitive', () => {
      const result: ErrorResponse = simpleErrorResponseSchema.parse({
        message: 'err',
        details: 'flat',
      });
      expect(result.details).toBeUndefined();
    });
  });

  describe('adversarial inputs', () => {
    it('throws when message is missing', () => {
      expect(() => simpleErrorResponseSchema.parse({ code: 'ERR' })).toThrow(
        'Error message must be a string',
      );
    });

    it('throws when message is null', () => {
      expect(() => simpleErrorResponseSchema.parse({ message: null })).toThrow(
        'Error message must be a string',
      );
    });

    it('throws when message is a number', () => {
      expect(() => simpleErrorResponseSchema.parse({ message: 404 })).toThrow(
        'Error message must be a string',
      );
    });

    it('throws when input is null', () => {
      expect(() => simpleErrorResponseSchema.parse(null)).toThrow('Error message must be a string');
    });

    it('throws when input is a string primitive', () => {
      expect(() => simpleErrorResponseSchema.parse('error string')).toThrow(
        'Error message must be a string',
      );
    });

    it('accepts empty string as message', () => {
      const result = simpleErrorResponseSchema.parse({ message: '' });
      expect(result.message).toBe('');
    });
  });
});

// ============================================================================
// emptyBodySchema
// ============================================================================

describe('emptyBodySchema', () => {
  it('parses any input as an empty record', () => {
    const result: EmptyBody = emptyBodySchema.parse({});
    expect(result).toEqual({});
  });

  it('ignores extra fields and returns empty record', () => {
    const result: EmptyBody = emptyBodySchema.parse({ foo: 'bar', baz: 42 });
    expect(result).toEqual({});
  });

  it('handles null input gracefully (returns empty record)', () => {
    const result: EmptyBody = emptyBodySchema.parse(null);
    expect(result).toEqual({});
  });

  it('handles string input gracefully (returns empty record)', () => {
    const result: EmptyBody = emptyBodySchema.parse('ignored');
    expect(result).toEqual({});
  });

  it('handles undefined input gracefully (returns empty record)', () => {
    const result: EmptyBody = emptyBodySchema.parse(undefined);
    expect(result).toEqual({});
  });
});

// ============================================================================
// createErrorCodeSchema
// ============================================================================

describe('createErrorCodeSchema', () => {
  const codes = { NOT_FOUND: 'NOT_FOUND', UNAUTHORIZED: 'UNAUTHORIZED' } as const;
  const schema = createErrorCodeSchema(codes);

  describe('happy path', () => {
    it('accepts a valid error code', () => {
      expect(schema.parse('NOT_FOUND')).toBe('NOT_FOUND');
      expect(schema.parse('UNAUTHORIZED')).toBe('UNAUTHORIZED');
    });
  });

  describe('adversarial inputs', () => {
    it('throws for an unknown code string', () => {
      expect(() => schema.parse('FORBIDDEN')).toThrow('Invalid error code: "FORBIDDEN"');
    });

    it('throws when input is not a string', () => {
      expect(() => schema.parse(404)).toThrow('Error code must be a string');
    });

    it('throws when input is null', () => {
      expect(() => schema.parse(null)).toThrow('Error code must be a string');
    });

    it('throws when input is undefined', () => {
      expect(() => schema.parse(undefined)).toThrow('Error code must be a string');
    });

    it('throws when input is an empty string (not in allowed codes)', () => {
      expect(() => schema.parse('')).toThrow('Invalid error code: ""');
    });

    it('throws for case-sensitive mismatch', () => {
      expect(() => schema.parse('not_found')).toThrow('Invalid error code: "not_found"');
    });

    it('throws for whitespace-padded valid code', () => {
      expect(() => schema.parse(' NOT_FOUND ')).toThrow('Invalid error code: " NOT_FOUND "');
    });
  });

  describe('edge cases', () => {
    it('works with an empty error codes record (no codes valid)', () => {
      const emptySchema = createErrorCodeSchema({});
      expect(() => emptySchema.parse('ANYTHING')).toThrow('Invalid error code: "ANYTHING"');
    });

    it('works with a single-code record', () => {
      const singleSchema = createErrorCodeSchema({ ONLY: 'ONLY' });
      expect(singleSchema.parse('ONLY')).toBe('ONLY');
      expect(() => singleSchema.parse('OTHER')).toThrow();
    });
  });
});

// ============================================================================
// errorCodeSchema (platform codes)
// ============================================================================

describe('errorCodeSchema', () => {
  it('throws for a completely invented code', () => {
    expect(() => errorCodeSchema.parse('MADE_UP_CODE_XYZ')).toThrow('Invalid error code:');
  });

  it('throws when input is not a string', () => {
    expect(() => errorCodeSchema.parse(true)).toThrow('Error code must be a string');
  });

  it('throws when input is null', () => {
    expect(() => errorCodeSchema.parse(null)).toThrow('Error code must be a string');
  });
});
