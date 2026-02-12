// src/shared/src/utils/pubsub/types.test.ts
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
