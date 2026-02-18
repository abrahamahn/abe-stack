// main/shared/src/engine/http/response.test.ts

import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from '../constants/platform';
import { createSchema } from '../../primitives/schema';
import {
  apiResultSchema,
  createErrorCodeSchema,
  emptyBodySchema,
  envelopeErrorResponseSchema,
  errorCodeSchema,
  errorResponseSchema,
  simpleErrorResponseSchema,
  successResponseSchema,
} from './response';

// ---------------------------------------------------------------------------
// Helper schemas
// ---------------------------------------------------------------------------

const stringSchema = createSchema((input: unknown) => {
  if (typeof input !== 'string') throw new Error('Expected string');
  return input;
});

const numberSchema = createSchema((input: unknown) => {
  if (typeof input !== 'number') throw new Error('Expected number');
  return input;
});

interface UserShape {
  id: number;
  name: string;
}

const userSchema = createSchema((input: unknown): UserShape => {
  const obj = input as Record<string, unknown>;
  if (typeof obj['id'] !== 'number') throw new Error('Expected id');
  if (typeof obj['name'] !== 'string') throw new Error('Expected name');
  return { id: obj['id'], name: obj['name'] };
});

// ---------------------------------------------------------------------------
// successResponseSchema
// ---------------------------------------------------------------------------

describe('successResponseSchema', () => {
  describe('happy path', () => {
    it('parses a valid success envelope wrapping a string', () => {
      const schema = successResponseSchema(stringSchema);
      const result = schema.parse({ ok: true, data: 'hello' });
      expect(result).toEqual({ ok: true, data: 'hello' });
    });

    it('parses a valid success envelope wrapping a number', () => {
      const schema = successResponseSchema(numberSchema);
      expect(schema.parse({ ok: true, data: 42 })).toEqual({ ok: true, data: 42 });
    });

    it('parses nested objects via the inner schema', () => {
      const schema = successResponseSchema(userSchema);
      expect(schema.parse({ ok: true, data: { id: 1, name: 'Alice' } })).toEqual({
        ok: true,
        data: { id: 1, name: 'Alice' },
      });
    });

    it('parses data that is an array when inner schema accepts arrays', () => {
      const arraySchema = createSchema((input: unknown) => {
        if (!Array.isArray(input)) throw new Error('Expected array');
        return input as unknown[];
      });
      const schema = successResponseSchema(arraySchema);
      const result = schema.parse({ ok: true, data: [1, 2, 3] });
      expect(result).toEqual({ ok: true, data: [1, 2, 3] });
    });

    it('ok: true is preserved as a literal true, not just truthy', () => {
      const schema = successResponseSchema(stringSchema);
      const result = schema.parse({ ok: true, data: 'x' });
      expect(result.ok).toBe(true);
    });
  });

  describe('failure states', () => {
    it('throws when ok is false', () => {
      const schema = successResponseSchema(stringSchema);
      expect(() => schema.parse({ ok: false, data: 'hello' })).toThrow('Expected ok to be true');
    });

    it('throws when ok is 1 (truthy but not true)', () => {
      const schema = successResponseSchema(stringSchema);
      expect(() => schema.parse({ ok: 1, data: 'hello' })).toThrow('Expected ok to be true');
    });

    it('throws when ok field is missing entirely', () => {
      const schema = successResponseSchema(stringSchema);
      expect(() => schema.parse({ data: 'hello' })).toThrow('Expected ok to be true');
    });

    it('throws when data fails inner schema validation', () => {
      const schema = successResponseSchema(numberSchema);
      expect(() => schema.parse({ ok: true, data: 'not-a-number' })).toThrow('Expected number');
    });

    it('throws when data is null and inner schema does not accept null', () => {
      const schema = successResponseSchema(stringSchema);
      expect(() => schema.parse({ ok: true, data: null })).toThrow();
    });

    it('throws when data is undefined and inner schema requires a value', () => {
      const schema = successResponseSchema(userSchema);
      expect(() => schema.parse({ ok: true, data: undefined })).toThrow();
    });

    it('treats null input as empty object — ok check fails', () => {
      const schema = successResponseSchema(stringSchema);
      expect(() => schema.parse(null)).toThrow('Expected ok to be true');
    });

    it('treats primitive input as empty object — ok check fails', () => {
      const schema = successResponseSchema(stringSchema);
      expect(() => schema.parse(42)).toThrow('Expected ok to be true');
    });

    it('throws when ok is a string "true" rather than boolean true', () => {
      const schema = successResponseSchema(stringSchema);
      expect(() => schema.parse({ ok: 'true', data: 'x' })).toThrow('Expected ok to be true');
    });

    it('safeParse returns failure result instead of throwing', () => {
      const schema = successResponseSchema(stringSchema);
      const result = schema.safeParse({ ok: false, data: 'x' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Expected ok to be true');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// errorResponseSchema / envelopeErrorResponseSchema
// ---------------------------------------------------------------------------

describe('errorResponseSchema (envelope)', () => {
  const validError = {
    ok: false,
    error: { code: 'BAD_REQUEST', message: 'Something went wrong' },
  };

  describe('happy path', () => {
    it('parses a minimal valid error envelope', () => {
      const result = errorResponseSchema.parse(validError);
      expect(result).toEqual({ ok: false, error: { code: 'BAD_REQUEST', message: 'Something went wrong', details: undefined } });
    });

    it('preserves ok: false as a literal false', () => {
      const result = errorResponseSchema.parse(validError);
      expect(result.ok).toBe(false);
    });

    it('passes through optional details when present', () => {
      const input = {
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid', details: { field: 'email' } },
      };
      const result = errorResponseSchema.parse(input);
      expect(result.error.details).toEqual({ field: 'email' });
    });

    it('envelopeErrorResponseSchema and errorResponseSchema are the same object', () => {
      expect(errorResponseSchema).toBe(envelopeErrorResponseSchema);
    });
  });

  describe('failure states', () => {
    it('throws when ok is true', () => {
      expect(() =>
        errorResponseSchema.parse({ ok: true, error: { code: 'X', message: 'Y' } }),
      ).toThrow('Expected ok to be false');
    });

    it('throws when ok is 0 (falsy but not false)', () => {
      expect(() =>
        errorResponseSchema.parse({ ok: 0, error: { code: 'X', message: 'Y' } }),
      ).toThrow('Expected ok to be false');
    });

    it('throws when ok field is missing', () => {
      expect(() =>
        errorResponseSchema.parse({ error: { code: 'X', message: 'Y' } }),
      ).toThrow('Expected ok to be false');
    });

    it('throws when error object is missing entirely', () => {
      expect(() => errorResponseSchema.parse({ ok: false })).toThrow('Error code must be a string');
    });

    it('throws when error.code is missing', () => {
      expect(() =>
        errorResponseSchema.parse({ ok: false, error: { message: 'oops' } }),
      ).toThrow('Error code must be a string');
    });

    it('throws when error.message is missing', () => {
      expect(() =>
        errorResponseSchema.parse({ ok: false, error: { code: 'X' } }),
      ).toThrow('Error message must be a string');
    });

    it('throws when error.code is a number instead of string', () => {
      expect(() =>
        errorResponseSchema.parse({ ok: false, error: { code: 123, message: 'msg' } }),
      ).toThrow('Error code must be a string');
    });

    it('throws when error.message is a number instead of string', () => {
      expect(() =>
        errorResponseSchema.parse({ ok: false, error: { code: 'X', message: 42 } }),
      ).toThrow('Error message must be a string');
    });

    it('treats null error field as empty object — code check fails', () => {
      expect(() =>
        errorResponseSchema.parse({ ok: false, error: null }),
      ).toThrow('Error code must be a string');
    });

    it('treats array as the error field — code check fails', () => {
      expect(() =>
        errorResponseSchema.parse({ ok: false, error: [] }),
      ).toThrow('Error code must be a string');
    });

    it('treats null top-level input as empty object — ok check fails', () => {
      expect(() => errorResponseSchema.parse(null)).toThrow('Expected ok to be false');
    });

    it('safeParse returns failure on malformed input', () => {
      const result = errorResponseSchema.safeParse({ ok: true, error: {} });
      expect(result.success).toBe(false);
    });

    it('does NOT reject extra fields on the error object — they are silently ignored', () => {
      // The schema does not strip extra fields; extra data passes through without error.
      const input = {
        ok: false,
        error: { code: 'X', message: 'Y', extra: 'ignored', nested: { deep: true } },
      };
      expect(() => errorResponseSchema.parse(input)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// simpleErrorResponseSchema
// ---------------------------------------------------------------------------

describe('simpleErrorResponseSchema', () => {
  describe('happy path', () => {
    it('parses a minimal response with only message', () => {
      const result = simpleErrorResponseSchema.parse({ message: 'oops' });
      expect(result).toEqual({ message: 'oops', code: undefined, details: undefined });
    });

    it('parses with optional code and details', () => {
      const result = simpleErrorResponseSchema.parse({
        message: 'bad',
        code: 'ERR_001',
        details: { field: 'email' },
      });
      expect(result).toEqual({ message: 'bad', code: 'ERR_001', details: { field: 'email' } });
    });
  });

  describe('failure states', () => {
    it('throws when message is missing', () => {
      expect(() => simpleErrorResponseSchema.parse({ code: 'X' })).toThrow(
        'Error message must be a string',
      );
    });

    it('throws when message is a number', () => {
      expect(() => simpleErrorResponseSchema.parse({ message: 99 })).toThrow(
        'Error message must be a string',
      );
    });

    it('throws on null input', () => {
      expect(() => simpleErrorResponseSchema.parse(null)).toThrow(
        'Error message must be a string',
      );
    });

    it('ignores code when it is a number — returns undefined for code', () => {
      const result = simpleErrorResponseSchema.parse({ message: 'err', code: 123 });
      expect(result.code).toBeUndefined();
    });

    it('ignores details when it is null — returns undefined for details', () => {
      const result = simpleErrorResponseSchema.parse({ message: 'err', details: null });
      expect(result.details).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// emptyBodySchema
// ---------------------------------------------------------------------------

describe('emptyBodySchema', () => {
  describe('happy path', () => {
    it('returns an empty object for an empty object input', () => {
      expect(emptyBodySchema.parse({})).toEqual({});
    });
  });

  describe('failure states — schema accepts anything without throwing', () => {
    it('returns empty object even when a non-empty object is passed — no rejection occurs', () => {
      // This is the core behavioural flaw: emptyBodySchema always returns {}
      // regardless of what data is actually passed. It cannot enforce "empty body".
      const result = emptyBodySchema.parse({ secret: 'data', count: 42 });
      expect(result).toEqual({});
    });

    it('returns empty object when a string is passed — non-object input is not rejected', () => {
      const result = emptyBodySchema.parse('this should be rejected');
      expect(result).toEqual({});
    });

    it('returns empty object when null is passed', () => {
      const result = emptyBodySchema.parse(null);
      expect(result).toEqual({});
    });

    it('returns empty object when an array is passed', () => {
      const result = emptyBodySchema.parse([1, 2, 3]);
      expect(result).toEqual({});
    });

    it('returns empty object when a number is passed', () => {
      const result = emptyBodySchema.parse(0);
      expect(result).toEqual({});
    });

    it('safeParse always succeeds regardless of input shape', () => {
      const result = emptyBodySchema.safeParse({ unwanted: true });
      expect(result.success).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// apiResultSchema
// ---------------------------------------------------------------------------

describe('apiResultSchema', () => {
  describe('success branch', () => {
    it('parses a success envelope', () => {
      const schema = apiResultSchema(stringSchema);
      const result = schema.parse({ ok: true, data: 'hello' });
      expect(result).toEqual({ ok: true, data: 'hello' });
    });

    it('delegates inner-data validation to the provided schema', () => {
      const schema = apiResultSchema(numberSchema);
      expect(() => schema.parse({ ok: true, data: 'not-a-number' })).toThrow('Expected number');
    });
  });

  describe('error branch', () => {
    it('parses an error envelope when ok is false', () => {
      const schema = apiResultSchema(stringSchema);
      const result = schema.parse({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'boom' },
      });
      expect(result).toEqual({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'boom', details: undefined },
      });
    });

    it('throws when ok is false but error object is malformed', () => {
      const schema = apiResultSchema(stringSchema);
      expect(() => schema.parse({ ok: false, error: {} })).toThrow('Error code must be a string');
    });
  });

  describe('failure states', () => {
    it('throws when ok is neither true nor false — falls through to error branch', () => {
      const schema = apiResultSchema(stringSchema);
      // ok is undefined → obj['ok'] !== true → tries error branch → error object missing
      expect(() => schema.parse({ ok: undefined })).toThrow('Expected ok to be false');
    });

    it('treats null input as empty object — ok is undefined, error branch fails', () => {
      const schema = apiResultSchema(stringSchema);
      expect(() => schema.parse(null)).toThrow('Expected ok to be false');
    });

    it('throws when the envelope is missing entirely', () => {
      const schema = apiResultSchema(stringSchema);
      expect(() => schema.parse(undefined)).toThrow();
    });

    it('safeParse returns failure on bad input', () => {
      const schema = apiResultSchema(stringSchema);
      const result = schema.safeParse({ completely: 'wrong' });
      expect(result.success).toBe(false);
    });

    it('ok: 1 is not treated as true — routed to error branch', () => {
      // obj['ok'] === true uses strict equality, so 1 !== true.
      const schema = apiResultSchema(stringSchema);
      expect(() => schema.parse({ ok: 1, data: 'x' })).toThrow('Expected ok to be false');
    });
  });
});

// ---------------------------------------------------------------------------
// createErrorCodeSchema
// ---------------------------------------------------------------------------

describe('createErrorCodeSchema', () => {
  const codes = { NOT_FOUND: 'NOT_FOUND', BAD_INPUT: 'BAD_INPUT' };

  describe('happy path', () => {
    it('accepts a valid code', () => {
      const schema = createErrorCodeSchema(codes);
      expect(schema.parse('NOT_FOUND')).toBe('NOT_FOUND');
    });

    it('accepts all defined codes', () => {
      const schema = createErrorCodeSchema(codes);
      expect(schema.parse('BAD_INPUT')).toBe('BAD_INPUT');
    });
  });

  describe('failure states', () => {
    it('throws for an unrecognised code string', () => {
      const schema = createErrorCodeSchema(codes);
      expect(() => schema.parse('UNKNOWN_CODE')).toThrow('Invalid error code: "UNKNOWN_CODE"');
    });

    it('throws for an empty string', () => {
      const schema = createErrorCodeSchema(codes);
      expect(() => schema.parse('')).toThrow('Invalid error code: ""');
    });

    it('throws when a number is passed instead of a string', () => {
      const schema = createErrorCodeSchema(codes);
      expect(() => schema.parse(42)).toThrow('Error code must be a string');
    });

    it('throws when null is passed', () => {
      const schema = createErrorCodeSchema(codes);
      expect(() => schema.parse(null)).toThrow('Error code must be a string');
    });

    it('throws when undefined is passed', () => {
      const schema = createErrorCodeSchema(codes);
      expect(() => schema.parse(undefined)).toThrow('Error code must be a string');
    });

    it('throws when input is a boolean', () => {
      const schema = createErrorCodeSchema(codes);
      expect(() => schema.parse(true)).toThrow('Error code must be a string');
    });

    it('is case-sensitive — lowercase variant of a valid code is rejected', () => {
      const schema = createErrorCodeSchema(codes);
      expect(() => schema.parse('not_found')).toThrow('Invalid error code: "not_found"');
    });

    it('rejects codes with leading or trailing whitespace', () => {
      const schema = createErrorCodeSchema(codes);
      expect(() => schema.parse(' NOT_FOUND ')).toThrow('Invalid error code: " NOT_FOUND "');
    });

    it('handles empty codes record — every string is rejected', () => {
      const schema = createErrorCodeSchema({});
      expect(() => schema.parse('ANYTHING')).toThrow('Invalid error code: "ANYTHING"');
    });

    it('uses object values not keys — key and value mismatch means key is rejected', () => {
      // Key is 'myKey', value is 'MY_VALUE'. Schema accepts 'MY_VALUE', not 'myKey'.
      const schema = createErrorCodeSchema({ myKey: 'MY_VALUE' });
      expect(() => schema.parse('myKey')).toThrow('Invalid error code: "myKey"');
      expect(schema.parse('MY_VALUE')).toBe('MY_VALUE');
    });

    it('handles very long code strings — rejected without special handling', () => {
      const schema = createErrorCodeSchema(codes);
      const longCode = 'A'.repeat(10_000);
      expect(() => schema.parse(longCode)).toThrow(`Invalid error code: "${longCode}"`);
    });

    it('duplicate values in codes record does not cause duplicates to be accepted twice', () => {
      // createErrorCodeSchema uses Object.values — duplicates appear once in the array
      // but validCodes.includes still works. Both accept the shared value.
      const schema = createErrorCodeSchema({ A: 'SHARED', B: 'SHARED' });
      expect(schema.parse('SHARED')).toBe('SHARED');
    });

    it('safeParse returns failure on invalid code', () => {
      const schema = createErrorCodeSchema(codes);
      const result = schema.safeParse('DOES_NOT_EXIST');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid error code');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// errorCodeSchema (built from ERROR_CODES platform constant)
// ---------------------------------------------------------------------------

describe('errorCodeSchema', () => {
  it('accepts all ERROR_CODES values', () => {
    for (const code of Object.values(ERROR_CODES)) {
      expect(errorCodeSchema.parse(code)).toBe(code);
    }
  });

  it('rejects an arbitrary string not in ERROR_CODES', () => {
    expect(() => errorCodeSchema.parse('TOTALLY_FAKE_CODE')).toThrow('Invalid error code');
  });

  it('rejects empty string', () => {
    expect(() => errorCodeSchema.parse('')).toThrow('Invalid error code');
  });

  it('rejects null', () => {
    expect(() => errorCodeSchema.parse(null)).toThrow('Error code must be a string');
  });
});
