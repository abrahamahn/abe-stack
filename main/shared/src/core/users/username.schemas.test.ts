// main/shared/src/core/users/username.schemas.test.ts

/**
 * @file Unit Tests for Username Schemas
 * @description Tests for username validation, cooldown logic, and reserved username checks.
 * @module Core/Users/Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getNextUsernameChangeDate,
  isUsernameChangeCooldownActive,
  RESERVED_USERNAMES,
  updateUsernameRequestSchema,
  USERNAME_CHANGE_COOLDOWN_DAYS,
} from './username.schemas';

// ============================================================================
// Tests: updateUsernameRequestSchema
// ============================================================================

describe('updateUsernameRequestSchema', () => {
  describe('valid usernames', () => {
    it('should accept a valid lowercase username', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: 'johndoe' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('johndoe');
      }
    });

    it('should accept username with numbers', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: 'john123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('john123');
      }
    });

    it('should accept username with underscores', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: 'john_doe' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('john_doe');
      }
    });

    it('should convert to lowercase', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: 'JohnDoe' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('johndoe');
      }
    });

    it('should trim whitespace', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: '  johndoe  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('johndoe');
      }
    });

    it('should accept 2-character username', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: 'ab' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('ab');
      }
    });

    it('should accept 30-character username', () => {
      const username = 'a' + 'b'.repeat(29);
      const result = updateUsernameRequestSchema.safeParse({ username });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe(username);
      }
    });
  });

  describe('invalid usernames', () => {
    it('should reject username starting with a number', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: '1john' });
      expect(result.success).toBe(false);
    });

    it('should reject username starting with underscore', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: '_john' });
      expect(result.success).toBe(false);
    });

    it('should reject single character username', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: 'a' });
      expect(result.success).toBe(false);
    });

    it('should reject username longer than 30 characters', () => {
      const username = 'a' + 'b'.repeat(30);
      const result = updateUsernameRequestSchema.safeParse({ username });
      expect(result.success).toBe(false);
    });

    it('should reject username with spaces', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: 'john doe' });
      expect(result.success).toBe(false);
    });

    it('should reject username with special characters', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: 'john@doe' });
      expect(result.success).toBe(false);
    });

    it('should reject username with hyphens', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: 'john-doe' });
      expect(result.success).toBe(false);
    });

    it('should reject empty username', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing username', () => {
      const result = updateUsernameRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-string username', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: 123 });
      expect(result.success).toBe(false);
    });

    it('should reject non-object data', () => {
      const result = updateUsernameRequestSchema.safeParse('johndoe');
      expect(result.success).toBe(false);
    });
  });

  describe('reserved usernames', () => {
    it('should reject all reserved usernames', () => {
      for (const reserved of RESERVED_USERNAMES) {
        const result = updateUsernameRequestSchema.safeParse({ username: reserved });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBe('This username is reserved');
        }
      }
    });

    it('should reject reserved usernames regardless of case', () => {
      const result = updateUsernameRequestSchema.safeParse({ username: 'ADMIN' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('This username is reserved');
      }
    });
  });
});

// ============================================================================
// Tests: isUsernameChangeCooldownActive
// ============================================================================

describe('isUsernameChangeCooldownActive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false when lastChange is null', () => {
    expect(isUsernameChangeCooldownActive(null)).toBe(false);
  });

  it('should return true when change was less than 30 days ago', () => {
    const now = new Date('2026-02-01T00:00:00Z');
    vi.setSystemTime(now);

    const lastChange = new Date('2026-01-15T00:00:00Z'); // 17 days ago
    expect(isUsernameChangeCooldownActive(lastChange)).toBe(true);
  });

  it('should return false when change was exactly 30 days ago', () => {
    const now = new Date('2026-02-14T00:00:00Z');
    vi.setSystemTime(now);

    const lastChange = new Date('2026-01-15T00:00:00Z'); // exactly 30 days ago
    expect(isUsernameChangeCooldownActive(lastChange)).toBe(false);
  });

  it('should return false when change was more than 30 days ago', () => {
    const now = new Date('2026-03-01T00:00:00Z');
    vi.setSystemTime(now);

    const lastChange = new Date('2026-01-15T00:00:00Z'); // 45 days ago
    expect(isUsernameChangeCooldownActive(lastChange)).toBe(false);
  });

  it('should return true when change was 1 second ago', () => {
    const now = new Date('2026-02-01T00:00:01Z');
    vi.setSystemTime(now);

    const lastChange = new Date('2026-02-01T00:00:00Z');
    expect(isUsernameChangeCooldownActive(lastChange)).toBe(true);
  });
});

// ============================================================================
// Tests: getNextUsernameChangeDate
// ============================================================================

describe('getNextUsernameChangeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return current date when lastChange is null', () => {
    const now = new Date('2026-02-01T00:00:00Z');
    vi.setSystemTime(now);

    const result = getNextUsernameChangeDate(null);
    expect(result.getTime()).toBe(now.getTime());
  });

  it('should return date 30 days after lastChange', () => {
    const lastChange = new Date('2026-01-15T00:00:00Z');
    const expected = new Date('2026-02-14T00:00:00Z');

    const result = getNextUsernameChangeDate(lastChange);
    expect(result.getTime()).toBe(expected.getTime());
  });

  it('should calculate based on exact milliseconds', () => {
    const lastChange = new Date('2026-01-15T12:30:45.123Z');
    const cooldownMs = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    const expected = new Date(lastChange.getTime() + cooldownMs);

    const result = getNextUsernameChangeDate(lastChange);
    expect(result.getTime()).toBe(expected.getTime());
  });
});

// ============================================================================
// Tests: Constants
// ============================================================================

describe('USERNAME_CHANGE_COOLDOWN_DAYS', () => {
  it('should be 30', () => {
    expect(USERNAME_CHANGE_COOLDOWN_DAYS).toBe(30);
  });
});

describe('RESERVED_USERNAMES', () => {
  it('should include common reserved names', () => {
    expect(RESERVED_USERNAMES).toContain('admin');
    expect(RESERVED_USERNAMES).toContain('root');
    expect(RESERVED_USERNAMES).toContain('support');
    expect(RESERVED_USERNAMES).toContain('system');
    expect(RESERVED_USERNAMES).toContain('api');
  });

  it('should be an array of strings', () => {
    for (const name of RESERVED_USERNAMES) {
      expect(typeof name).toBe('string');
    }
  });
});
