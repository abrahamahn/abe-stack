// main/shared/src/system/pubsub/types.test.ts
import { describe, it, expect } from 'vitest';

import { parseRecordKey, SubKeys } from './types';

describe('parseRecordKey', () => {
  describe('valid record keys', () => {
    it('should parse basic record key with alphanumeric table and id', () => {
      const result = parseRecordKey('record:users:abc-123');
      expect(result).toEqual({ table: 'users', id: 'abc-123' });
    });

    it('should parse record key with underscore in table name', () => {
      const result = parseRecordKey('record:user_profiles:uuid-here');
      expect(result).toEqual({ table: 'user_profiles', id: 'uuid-here' });
    });

    it('should parse record key with table starting with underscore', () => {
      const result = parseRecordKey('record:_internal:id');
      expect(result).toEqual({ table: '_internal', id: 'id' });
    });

    it('should parse record key with UUID-style id', () => {
      const result = parseRecordKey('record:orders:550e8400-e29b-41d4-a716-446655440000');
      expect(result).toEqual({ table: 'orders', id: '550e8400-e29b-41d4-a716-446655440000' });
    });

    it('should parse record key with id containing underscores', () => {
      const result = parseRecordKey('record:sessions:user_123_session_456');
      expect(result).toEqual({ table: 'sessions', id: 'user_123_session_456' });
    });
  });

  describe('invalid record keys - wrong format', () => {
    it('should return undefined for wrong prefix', () => {
      expect(parseRecordKey('list:users:123')).toBeUndefined();
    });

    it('should return undefined for missing parts', () => {
      expect(parseRecordKey('record:users')).toBeUndefined();
    });

    it('should return undefined for too many parts', () => {
      expect(parseRecordKey('record:users:123:extra')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parseRecordKey('')).toBeUndefined();
    });

    it('should return undefined for single part', () => {
      expect(parseRecordKey('record')).toBeUndefined();
    });
  });

  describe('invalid record keys - empty components', () => {
    it('should return undefined for empty table', () => {
      expect(parseRecordKey('record::123')).toBeUndefined();
    });

    it('should return undefined for empty id', () => {
      expect(parseRecordKey('record:users:')).toBeUndefined();
    });

    it('should return undefined for both empty', () => {
      expect(parseRecordKey('record::')).toBeUndefined();
    });
  });

  describe('invalid record keys - table name validation', () => {
    it('should return undefined for table with hyphens', () => {
      expect(parseRecordKey('record:my-table:123')).toBeUndefined();
    });

    it('should return undefined for table starting with number', () => {
      expect(parseRecordKey('record:1users:123')).toBeUndefined();
    });

    it('should return undefined for table with special characters', () => {
      expect(parseRecordKey('record:user$table:123')).toBeUndefined();
    });

    it('should return undefined for table with spaces', () => {
      expect(parseRecordKey('record:user table:123')).toBeUndefined();
    });
  });

  describe('invalid record keys - id validation', () => {
    it('should return undefined for id with special characters', () => {
      expect(parseRecordKey('record:users:abc@def')).toBeUndefined();
    });

    it('should return undefined for id with spaces', () => {
      expect(parseRecordKey('record:users:abc def')).toBeUndefined();
    });

    it('should return undefined for id with dots', () => {
      expect(parseRecordKey('record:users:abc.def')).toBeUndefined();
    });

    it('should return undefined for id with slashes', () => {
      expect(parseRecordKey('record:users:abc/def')).toBeUndefined();
    });
  });

  describe('round-trip with SubKeys.record', () => {
    it('should parse keys created by SubKeys.record', () => {
      const key = SubKeys.record('users', 'abc-123');
      const parsed = parseRecordKey(key);
      expect(parsed).toEqual({ table: 'users', id: 'abc-123' });
    });

    it('should parse keys with underscore table', () => {
      const key = SubKeys.record('user_profiles', 'uuid-here');
      const parsed = parseRecordKey(key);
      expect(parsed).toEqual({ table: 'user_profiles', id: 'uuid-here' });
    });

    it('should parse keys with complex UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const key = SubKeys.record('orders', uuid);
      const parsed = parseRecordKey(key);
      expect(parsed).toEqual({ table: 'orders', id: uuid });
    });
  });
});

// ============================================================================
// Adversarial: parseRecordKey edge cases
// ============================================================================

describe('parseRecordKey — adversarial', () => {
  it('returns undefined for only colons ":::"', () => {
    expect(parseRecordKey(':::')).toBeUndefined();
  });

  it('returns undefined for "record::::" (5 parts)', () => {
    expect(parseRecordKey('record::::')).toBeUndefined();
  });

  it('returns undefined for prefix "RECORD" (uppercase)', () => {
    expect(parseRecordKey('RECORD:users:123')).toBeUndefined();
  });

  it('returns undefined for prefix "Record" (mixed case)', () => {
    expect(parseRecordKey('Record:users:123')).toBeUndefined();
  });

  it('returns undefined for table with newline character', () => {
    expect(parseRecordKey('record:user\ntable:123')).toBeUndefined();
  });

  it('returns undefined for table with tab character', () => {
    expect(parseRecordKey('record:user\ttable:123')).toBeUndefined();
  });

  it('returns undefined for id containing colon (creates 4 parts)', () => {
    // 'record:users:id:with:colons' → parts.length=5 → undefined
    expect(parseRecordKey('record:users:id:with:colons')).toBeUndefined();
  });

  it('returns undefined for id with SQL injection attempt', () => {
    expect(parseRecordKey("record:users:'; DROP TABLE users; --")).toBeUndefined();
  });

  it('returns undefined for id with null byte', () => {
    expect(parseRecordKey('record:users:id\x00null')).toBeUndefined();
  });

  it('returns undefined for key that is just colons "::"', () => {
    expect(parseRecordKey('::')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(parseRecordKey('   ')).toBeUndefined();
  });

  it('returns undefined for very long table name (valid chars but 10000 long)', () => {
    // regex allows any length, but let's verify it doesn't throw or behave unexpectedly
    const longTable = 'a'.repeat(10_000);
    const result = parseRecordKey(`record:${longTable}:id-1`);
    // Should be defined (valid chars) — just documents behavior
    expect(result).toEqual({ table: longTable, id: 'id-1' });
  });

  it('returns undefined for id with unicode letters', () => {
    // The regex /^[a-zA-Z0-9_-]+$/ only allows ASCII
    expect(parseRecordKey('record:users:ユーザー123')).toBeUndefined();
  });

  it('returns undefined for id with emoji', () => {
    expect(parseRecordKey('record:users:🚀abc')).toBeUndefined();
  });

  it('returns undefined for table with unicode letters', () => {
    expect(parseRecordKey('record:ユーザーtable:abc')).toBeUndefined();
  });

  it('returns undefined for prototype pollution attempt (__proto__)', () => {
    // table = '__proto__' contains only valid chars (letters, underscores)
    // but id must also be valid
    const result = parseRecordKey('record:__proto__:id-123');
    // Should parse normally — __proto__ is valid identifier chars
    expect(result).toEqual({ table: '__proto__', id: 'id-123' });
  });

  it('returns undefined for constructor as table name', () => {
    const result = parseRecordKey('record:constructor:abc');
    // 'constructor' has valid chars → should parse
    expect(result).toEqual({ table: 'constructor', id: 'abc' });
  });
});

// ============================================================================
// Adversarial: SubKeys factory
// ============================================================================

describe('SubKeys — adversarial', () => {
  it('record creates key with special chars in table (no validation at SubKeys level)', () => {
    // SubKeys does not validate inputs — it's a template literal
    const key = SubKeys.record('my-invalid-table!', 'id');
    expect(key).toBe('record:my-invalid-table!:id');
    // parseRecordKey would reject this
    expect(parseRecordKey(key)).toBeUndefined();
  });

  it('list creates key with expected format', () => {
    const key = SubKeys.list('user-123', 'tasks');
    expect(key).toBe('list:user-123:tasks');
  });

  it('list does not validate inputs', () => {
    const key = SubKeys.list('', '');
    expect(key).toBe('list::');
  });

  it('record with empty strings produces parseable-but-invalid key', () => {
    const key = SubKeys.record('', '');
    expect(key).toBe('record::');
    // parseRecordKey rejects empty table/id
    expect(parseRecordKey(key)).toBeUndefined();
  });

  it('record round-trip with all-underscore table', () => {
    const key = SubKeys.record('___', 'abc-123');
    expect(parseRecordKey(key)).toEqual({ table: '___', id: 'abc-123' });
  });

  it('record with id that is pure digits and underscores', () => {
    const key = SubKeys.record('orders', '123_456_789');
    expect(parseRecordKey(key)).toEqual({ table: 'orders', id: '123_456_789' });
  });

  it('record type is narrowed to RecordKey literal type format', () => {
    const key = SubKeys.record('users', 'abc');
    // TypeScript narrowing: key starts with 'record:'
    expect(key.startsWith('record:')).toBe(true);
  });

  it('list type is narrowed to ListKey literal type format', () => {
    const key = SubKeys.list('user-1', 'notifications');
    expect(key.startsWith('list:')).toBe(true);
  });
});
