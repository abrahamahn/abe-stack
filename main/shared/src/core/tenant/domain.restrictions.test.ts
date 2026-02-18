// main/shared/src/core/tenant/domain.restrictions.test.ts

/**
 * @file Unit Tests for Domain Restrictions
 * @description Tests for email domain restriction validation.
 * @module Core/Tenant/Tests
 */

import { describe, expect, it } from 'vitest';

import { extractEmailDomain, isEmailDomainAllowed } from './domain.restrictions';

// ============================================================================
// extractEmailDomain
// ============================================================================

describe('extractEmailDomain', () => {
  it('extracts domain from a valid email', () => {
    expect(extractEmailDomain('user@example.com')).toBe('example.com');
  });

  it('returns lowercase domain', () => {
    expect(extractEmailDomain('user@EXAMPLE.COM')).toBe('example.com');
  });

  it('handles subdomains', () => {
    expect(extractEmailDomain('user@mail.example.co.uk')).toBe('mail.example.co.uk');
  });

  it('returns empty string for invalid email', () => {
    expect(extractEmailDomain('invalid')).toBe('');
  });

  it('uses last @ if multiple present', () => {
    expect(extractEmailDomain('user@first@second.com')).toBe('second.com');
  });
});

// ============================================================================
// isEmailDomainAllowed
// ============================================================================

describe('isEmailDomainAllowed', () => {
  it('allows all domains when allowlist is empty', () => {
    expect(isEmailDomainAllowed('user@anything.com', [])).toBe(true);
  });

  it('allows email with matching domain', () => {
    expect(isEmailDomainAllowed('user@example.com', ['example.com'])).toBe(true);
  });

  it('rejects email with non-matching domain', () => {
    expect(isEmailDomainAllowed('user@other.com', ['example.com'])).toBe(false);
  });

  it('performs case-insensitive comparison', () => {
    expect(isEmailDomainAllowed('user@EXAMPLE.COM', ['example.com'])).toBe(true);
    expect(isEmailDomainAllowed('user@example.com', ['EXAMPLE.COM'])).toBe(true);
  });

  it('supports multiple allowed domains', () => {
    const allowed = ['example.com', 'company.org'];
    expect(isEmailDomainAllowed('user@example.com', allowed)).toBe(true);
    expect(isEmailDomainAllowed('user@company.org', allowed)).toBe(true);
    expect(isEmailDomainAllowed('user@other.net', allowed)).toBe(false);
  });

  it('rejects invalid email even if allowlist is non-empty', () => {
    expect(isEmailDomainAllowed('invalid', ['example.com'])).toBe(false);
  });
});
