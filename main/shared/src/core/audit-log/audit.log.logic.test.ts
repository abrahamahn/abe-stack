// main/shared/src/core/audit-log/audit.log.logic.test.ts

/**
 * @file Audit Log Logic Tests
 * @description Tests for audit event builder and metadata sanitization.
 * @module Core/AuditLog/Tests
 */

import { describe, expect, it } from 'vitest';

import { buildAuditEvent, sanitizeMetadata } from './audit.log.logic';

// ============================================================================
// sanitizeMetadata
// ============================================================================

describe('sanitizeMetadata', () => {
  it('redacts sensitive keys', () => {
    const metadata = {
      userId: 'user-1',
      password: 'secret123',
      token: 'abc-token',
      apiKey: 'key-123',
      email: 'user@test.com',
    };

    const result = sanitizeMetadata(metadata);
    expect(result['userId']).toBe('user-1');
    expect(result['password']).toBe('[REDACTED]');
    expect(result['token']).toBe('[REDACTED]');
    expect(result['apiKey']).toBe('[REDACTED]');
    expect(result['email']).toBe('user@test.com');
  });

  it('redacts case-insensitively (key contains sensitive word)', () => {
    const metadata = {
      userPassword: 'secret',
      accessToken: 'abc',
      clientSecret: 'xyz',
      privateKey: 'key',
    };

    const result = sanitizeMetadata(metadata);
    expect(result['userPassword']).toBe('[REDACTED]');
    expect(result['accessToken']).toBe('[REDACTED]');
    expect(result['clientSecret']).toBe('[REDACTED]');
    expect(result['privateKey']).toBe('[REDACTED]');
  });

  it('recursively sanitizes nested objects', () => {
    const metadata = {
      user: {
        name: 'John',
        password: 'hidden',
      },
    };

    const result = sanitizeMetadata(metadata);
    const user = result['user'] as Record<string, unknown>;
    expect(user['name']).toBe('John');
    expect(user['password']).toBe('[REDACTED]');
  });

  it('sanitizes objects inside arrays', () => {
    const metadata = {
      items: [
        { name: 'item1', token: 'secret-token' },
        { name: 'item2', safe: true },
      ],
    };

    const result = sanitizeMetadata(metadata);
    const items = result['items'] as Record<string, unknown>[];
    expect(items[0]?.['token']).toBe('[REDACTED]');
    expect(items[0]?.['name']).toBe('item1');
    expect(items[1]?.['safe']).toBe(true);
  });

  it('preserves primitive values in arrays', () => {
    const metadata = {
      tags: ['tag1', 'tag2', 'tag3'],
    };

    const result = sanitizeMetadata(metadata);
    expect(result['tags']).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('handles empty metadata', () => {
    expect(sanitizeMetadata({})).toEqual({});
  });
});

// ============================================================================
// buildAuditEvent
// ============================================================================

describe('buildAuditEvent', () => {
  it('builds event with required fields and defaults', () => {
    const event = buildAuditEvent({
      action: 'user.created',
      resource: 'user',
    });

    expect(event.action).toBe('user.created');
    expect(event.resource).toBe('user');
    expect(event.actorId).toBeNull();
    expect(event.tenantId).toBeNull();
    expect(event.metadata).toEqual({});
    expect(event.category).toBe('admin');
    expect(event.severity).toBe('info');
  });

  it('uses provided values when specified', () => {
    const event = buildAuditEvent({
      action: 'billing.charge',
      resource: 'subscription',
      actorId: 'user-1' as ReturnType<typeof import('../types/ids').parseUserId>,
      tenantId: 'tenant-1' as ReturnType<typeof import('../types/ids').parseTenantId>,
      category: 'billing',
      severity: 'warn',
      resourceId: 'sub-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(event.actorId).toBe('user-1');
    expect(event.tenantId).toBe('tenant-1');
    expect(event.category).toBe('billing');
    expect(event.severity).toBe('warn');
    expect(event.resourceId).toBe('sub-123');
    expect(event.ipAddress).toBe('192.168.1.1');
    expect(event.userAgent).toBe('Mozilla/5.0');
  });

  it('sanitizes metadata in the built event', () => {
    const event = buildAuditEvent({
      action: 'auth.login',
      resource: 'session',
      metadata: {
        email: 'user@test.com',
        password: 'secret123',
      },
    });

    expect(event.metadata['email']).toBe('user@test.com');
    expect(event.metadata['password']).toBe('[REDACTED]');
  });
});
