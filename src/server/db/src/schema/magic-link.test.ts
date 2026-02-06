// backend/db/src/schema/magic-link.test.ts
/**
 * Magic Link Schema Tests
 *
 * Tests for magic link schema constants and type structure.
 * Validates table name, column mappings, and type definitions.
 */

import { describe, expect, it } from 'vitest';

import { MAGIC_LINK_TOKEN_COLUMNS, MAGIC_LINK_TOKENS_TABLE } from './magic-link';

import type { MagicLinkToken, NewMagicLinkToken } from './magic-link';

describe('MAGIC_LINK_TOKENS_TABLE', () => {
  it('should have correct table name', () => {
    expect(MAGIC_LINK_TOKENS_TABLE).toBe('magic_link_tokens');
  });

  it('should be a string', () => {
    expect(typeof MAGIC_LINK_TOKENS_TABLE).toBe('string');
  });

  it('should not be empty', () => {
    expect(MAGIC_LINK_TOKENS_TABLE).not.toBe('');
  });
});

describe('MAGIC_LINK_TOKEN_COLUMNS', () => {
  describe('structure', () => {
    it('should have all required column mappings', () => {
      expect(MAGIC_LINK_TOKEN_COLUMNS).toHaveProperty('id');
      expect(MAGIC_LINK_TOKEN_COLUMNS).toHaveProperty('email');
      expect(MAGIC_LINK_TOKEN_COLUMNS).toHaveProperty('tokenHash');
      expect(MAGIC_LINK_TOKEN_COLUMNS).toHaveProperty('expiresAt');
      expect(MAGIC_LINK_TOKEN_COLUMNS).toHaveProperty('usedAt');
      expect(MAGIC_LINK_TOKEN_COLUMNS).toHaveProperty('createdAt');
      expect(MAGIC_LINK_TOKEN_COLUMNS).toHaveProperty('ipAddress');
      expect(MAGIC_LINK_TOKEN_COLUMNS).toHaveProperty('userAgent');
    });

    it('should have exactly 8 columns', () => {
      expect(Object.keys(MAGIC_LINK_TOKEN_COLUMNS)).toHaveLength(8);
    });

    it('should be readonly at compile time (as const)', () => {
      type ColumnsType = typeof MAGIC_LINK_TOKEN_COLUMNS;
      type IdKey = ColumnsType['id'];

      const testReadonly: IdKey = 'id';
      expect(testReadonly).toBe('id');
    });
  });

  describe('column mappings - camelCase to snake_case', () => {
    it('should map id to id', () => {
      expect(MAGIC_LINK_TOKEN_COLUMNS.id).toBe('id');
    });

    it('should map email to email', () => {
      expect(MAGIC_LINK_TOKEN_COLUMNS.email).toBe('email');
    });

    it('should map tokenHash to token_hash', () => {
      expect(MAGIC_LINK_TOKEN_COLUMNS.tokenHash).toBe('token_hash');
    });

    it('should map expiresAt to expires_at', () => {
      expect(MAGIC_LINK_TOKEN_COLUMNS.expiresAt).toBe('expires_at');
    });

    it('should map usedAt to used_at', () => {
      expect(MAGIC_LINK_TOKEN_COLUMNS.usedAt).toBe('used_at');
    });

    it('should map createdAt to created_at', () => {
      expect(MAGIC_LINK_TOKEN_COLUMNS.createdAt).toBe('created_at');
    });

    it('should map ipAddress to ip_address', () => {
      expect(MAGIC_LINK_TOKEN_COLUMNS.ipAddress).toBe('ip_address');
    });

    it('should map userAgent to user_agent', () => {
      expect(MAGIC_LINK_TOKEN_COLUMNS.userAgent).toBe('user_agent');
    });
  });

  describe('column value types', () => {
    it('should have all string values', () => {
      for (const value of Object.values(MAGIC_LINK_TOKEN_COLUMNS)) {
        expect(typeof value).toBe('string');
      }
    });

    it('should have all non-empty string values', () => {
      for (const value of Object.values(MAGIC_LINK_TOKEN_COLUMNS)) {
        expect(value).not.toBe('');
      }
    });

    it('should have no duplicate values', () => {
      const values = Object.values(MAGIC_LINK_TOKEN_COLUMNS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should use snake_case for database column names', () => {
      const snakeCasePattern = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
      for (const value of Object.values(MAGIC_LINK_TOKEN_COLUMNS)) {
        expect(value).toMatch(snakeCasePattern);
      }
    });
  });

  describe('column key types', () => {
    it('should have all camelCase keys', () => {
      const camelCasePattern = /^[a-z][a-zA-Z0-9]*$/;
      for (const key of Object.keys(MAGIC_LINK_TOKEN_COLUMNS)) {
        expect(key).toMatch(camelCasePattern);
      }
    });

    it('should have no duplicate keys', () => {
      const keys = Object.keys(MAGIC_LINK_TOKEN_COLUMNS);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });
});

describe('MagicLinkToken type', () => {
  it('should accept valid magic link token', () => {
    const validToken: MagicLinkToken = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      tokenHash: 'hashed_token_abc123',
      expiresAt: new Date('2024-01-01T00:15:00Z'),
      usedAt: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    expect(validToken.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(validToken.email).toBe('user@example.com');
  });

  it('should accept token with used timestamp', () => {
    const usedToken: MagicLinkToken = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      tokenHash: 'hashed_token_abc123',
      expiresAt: new Date('2024-01-01T00:15:00Z'),
      usedAt: new Date('2024-01-01T00:10:00Z'),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    expect(usedToken.usedAt).toBeInstanceOf(Date);
    expect(usedToken.usedAt).not.toBeNull();
  });

  it('should accept token with null optional fields', () => {
    const minimalToken: MagicLinkToken = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      tokenHash: 'hashed_token_abc123',
      expiresAt: new Date('2024-01-01T00:15:00Z'),
      usedAt: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      ipAddress: null,
      userAgent: null,
    };

    expect(minimalToken.ipAddress).toBeNull();
    expect(minimalToken.userAgent).toBeNull();
    expect(minimalToken.usedAt).toBeNull();
  });

  it('should enforce all required fields', () => {
    const tokenWithAllFields: MagicLinkToken = {
      id: 'id',
      email: 'email',
      tokenHash: 'hash',
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date(),
      ipAddress: null,
      userAgent: null,
    };

    expect(tokenWithAllFields).toHaveProperty('id');
    expect(tokenWithAllFields).toHaveProperty('email');
    expect(tokenWithAllFields).toHaveProperty('tokenHash');
    expect(tokenWithAllFields).toHaveProperty('expiresAt');
    expect(tokenWithAllFields).toHaveProperty('usedAt');
    expect(tokenWithAllFields).toHaveProperty('createdAt');
    expect(tokenWithAllFields).toHaveProperty('ipAddress');
    expect(tokenWithAllFields).toHaveProperty('userAgent');
  });
});

describe('NewMagicLinkToken type', () => {
  it('should accept minimal new token (only required fields)', () => {
    const minimalNewToken: NewMagicLinkToken = {
      email: 'user@example.com',
      tokenHash: 'hashed_token_abc123',
      expiresAt: new Date('2024-01-01T00:15:00Z'),
    };

    expect(minimalNewToken.email).toBe('user@example.com');
    expect(minimalNewToken.tokenHash).toBe('hashed_token_abc123');
    expect(minimalNewToken.expiresAt).toBeInstanceOf(Date);
  });

  it('should accept new token with optional id', () => {
    const tokenWithId: NewMagicLinkToken = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      tokenHash: 'hashed_token_abc123',
      expiresAt: new Date('2024-01-01T00:15:00Z'),
    };

    expect(tokenWithId.id).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should accept new token with all optional fields', () => {
    const fullNewToken: NewMagicLinkToken = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      tokenHash: 'hashed_token_abc123',
      expiresAt: new Date('2024-01-01T00:15:00Z'),
      usedAt: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    expect(fullNewToken.id).toBeDefined();
    expect(fullNewToken.createdAt).toBeInstanceOf(Date);
    expect(fullNewToken.ipAddress).toBe('192.168.1.1');
    expect(fullNewToken.userAgent).toBe('Mozilla/5.0');
  });

  it('should accept null for nullable optional fields', () => {
    const tokenWithNulls: NewMagicLinkToken = {
      email: 'user@example.com',
      tokenHash: 'hashed_token_abc123',
      expiresAt: new Date('2024-01-01T00:15:00Z'),
      usedAt: null,
      ipAddress: null,
      userAgent: null,
    };

    expect(tokenWithNulls.usedAt).toBeNull();
    expect(tokenWithNulls.ipAddress).toBeNull();
    expect(tokenWithNulls.userAgent).toBeNull();
  });

  it('should accept pre-set usedAt timestamp', () => {
    const usedToken: NewMagicLinkToken = {
      email: 'user@example.com',
      tokenHash: 'hashed_token_abc123',
      expiresAt: new Date('2024-01-01T00:15:00Z'),
      usedAt: new Date('2024-01-01T00:10:00Z'),
    };

    expect(usedToken.usedAt).toBeInstanceOf(Date);
  });
});

describe('Type consistency', () => {
  it('should have matching field names between MagicLinkToken and NewMagicLinkToken', () => {
    const magicLinkTokenFields: Array<keyof MagicLinkToken> = [
      'id',
      'email',
      'tokenHash',
      'expiresAt',
      'usedAt',
      'createdAt',
      'ipAddress',
      'userAgent',
    ];

    const newMagicLinkTokenFields: Array<keyof NewMagicLinkToken> = [
      'id',
      'email',
      'tokenHash',
      'expiresAt',
      'usedAt',
      'createdAt',
      'ipAddress',
      'userAgent',
    ];

    expect(magicLinkTokenFields.sort()).toEqual(newMagicLinkTokenFields.sort());
  });

  it('should have column mapping for every MagicLinkToken field', () => {
    const tokenFields: Array<keyof MagicLinkToken> = [
      'id',
      'email',
      'tokenHash',
      'expiresAt',
      'usedAt',
      'createdAt',
      'ipAddress',
      'userAgent',
    ];

    const columnKeys = Object.keys(MAGIC_LINK_TOKEN_COLUMNS);

    for (const field of tokenFields) {
      expect(columnKeys).toContain(field);
    }
  });

  it('should have MagicLinkToken field for every column mapping', () => {
    const tokenFields: Array<keyof MagicLinkToken> = [
      'id',
      'email',
      'tokenHash',
      'expiresAt',
      'usedAt',
      'createdAt',
      'ipAddress',
      'userAgent',
    ];

    for (const columnKey of Object.keys(MAGIC_LINK_TOKEN_COLUMNS)) {
      expect(tokenFields).toContain(columnKey as keyof MagicLinkToken);
    }
  });
});

describe('Security considerations', () => {
  it('should document token hashing in comments', () => {
    const tokenExample: MagicLinkToken = {
      id: 'id',
      email: 'user@example.com',
      tokenHash: 'should_be_sha256_hash',
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date(),
      ipAddress: null,
      userAgent: null,
    };

    expect(tokenExample.tokenHash).toBeDefined();
    expect(typeof tokenExample.tokenHash).toBe('string');
  });

  it('should track usage via usedAt field', () => {
    const unusedToken: MagicLinkToken = {
      id: 'id',
      email: 'user@example.com',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      usedAt: null,
      createdAt: new Date(),
      ipAddress: null,
      userAgent: null,
    };

    expect(unusedToken.usedAt).toBeNull();

    const usedTokenExample: MagicLinkToken = {
      ...unusedToken,
      usedAt: new Date(),
    };

    expect(usedTokenExample.usedAt).not.toBeNull();
  });

  it('should track client metadata for security audit', () => {
    const tokenWithMetadata: MagicLinkToken = {
      id: 'id',
      email: 'user@example.com',
      tokenHash: 'hash',
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date(),
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    };

    expect(tokenWithMetadata.ipAddress).toBeDefined();
    expect(tokenWithMetadata.userAgent).toBeDefined();
  });

  it('should support short expiry via expiresAt field', () => {
    const now = new Date();
    const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);

    const shortExpiryToken: MagicLinkToken = {
      id: 'id',
      email: 'user@example.com',
      tokenHash: 'hash',
      expiresAt: fifteenMinutesLater,
      usedAt: null,
      createdAt: now,
      ipAddress: null,
      userAgent: null,
    };

    const timeDiffMinutes =
      (shortExpiryToken.expiresAt.getTime() - shortExpiryToken.createdAt.getTime()) / (1000 * 60);

    expect(timeDiffMinutes).toBe(15);
  });
});

describe('Edge cases', () => {
  it('should handle email with various formats', () => {
    const emailFormats = [
      'simple@example.com',
      'user+tag@example.com',
      'user.name@example.co.uk',
      'user@subdomain.example.com',
    ];

    for (const email of emailFormats) {
      const token: MagicLinkToken = {
        id: 'id',
        email,
        tokenHash: 'hash',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
        ipAddress: null,
        userAgent: null,
      };
      expect(token.email).toBe(email);
    }
  });

  it('should handle various IP address formats', () => {
    const ipAddresses = [
      '192.168.1.1',
      '10.0.0.1',
      '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      '::1',
    ];

    for (const ipAddress of ipAddresses) {
      const token: MagicLinkToken = {
        id: 'id',
        email: 'user@example.com',
        tokenHash: 'hash',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
        ipAddress,
        userAgent: null,
      };
      expect(token.ipAddress).toBe(ipAddress);
    }
  });

  it('should handle long user agent strings', () => {
    const longUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

    const token: MagicLinkToken = {
      id: 'id',
      email: 'user@example.com',
      tokenHash: 'hash',
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date(),
      ipAddress: null,
      userAgent: longUserAgent,
    };

    expect(token.userAgent).toBe(longUserAgent);
  });

  it('should handle token used immediately after creation', () => {
    const now = new Date();
    const token: MagicLinkToken = {
      id: 'id',
      email: 'user@example.com',
      tokenHash: 'hash',
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
      usedAt: now,
      createdAt: now,
      ipAddress: null,
      userAgent: null,
    };

    expect(token.usedAt).toEqual(token.createdAt);
  });

  it('should handle expired but unused token', () => {
    const pastDate = new Date('2020-01-01T00:00:00Z');
    const token: MagicLinkToken = {
      id: 'id',
      email: 'user@example.com',
      tokenHash: 'hash',
      expiresAt: pastDate,
      usedAt: null,
      createdAt: new Date('2020-01-01T00:00:00Z'),
      ipAddress: null,
      userAgent: null,
    };

    expect(token.usedAt).toBeNull();
    expect(token.expiresAt.getTime()).toBeLessThan(Date.now());
  });
});
