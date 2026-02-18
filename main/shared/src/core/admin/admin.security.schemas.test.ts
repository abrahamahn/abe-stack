// main/shared/src/core/admin/admin.security.schemas.test.ts
/**
 * @file Security Audit Schemas Tests
 * @description Tests for securityEventsFilterSchema date validation.
 * @module Core/Admin/Security/Tests
 */

import { describe, expect, it } from 'vitest';

import { securityEventsFilterSchema } from './admin.security.schemas';

describe('securityEventsFilterSchema', () => {
  it('accepts valid ISO date strings', () => {
    const result = securityEventsFilterSchema.safeParse({
      startDate: '2024-01-15T00:00:00.000Z',
      endDate: '2024-02-15T23:59:59.999Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBe('2024-01-15T00:00:00.000Z');
      expect(result.data.endDate).toBe('2024-02-15T23:59:59.999Z');
    }
  });

  it('accepts date-only strings', () => {
    const result = securityEventsFilterSchema.safeParse({
      startDate: '2024-01-15',
      endDate: '2024-02-15',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-date strings for startDate', () => {
    const result = securityEventsFilterSchema.safeParse({
      startDate: 'banana',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-date strings for endDate', () => {
    const result = securityEventsFilterSchema.safeParse({
      endDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty string as startDate', () => {
    const result = securityEventsFilterSchema.safeParse({
      startDate: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts filter with no date fields', () => {
    const result = securityEventsFilterSchema.safeParse({
      severity: 'high',
      eventType: 'login_failure',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty/null/undefined input', () => {
    expect(securityEventsFilterSchema.safeParse(undefined).success).toBe(true);
    expect(securityEventsFilterSchema.safeParse(null).success).toBe(true);
    expect(securityEventsFilterSchema.safeParse({}).success).toBe(true);
  });

  it('rejects non-string startDate type', () => {
    const result = securityEventsFilterSchema.safeParse({
      startDate: 12345,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid severity', () => {
    const result = securityEventsFilterSchema.safeParse({
      severity: 'extreme',
    });
    expect(result.success).toBe(false);
  });
});
