// main/apps/web/src/i18n/utils.test.ts
/**
 * Tests for i18n utility functions.
 *
 * Covers:
 * - interpolate: template string interpolation with params
 * - flattenTranslations: nested-to-flat translation map conversion
 * - detectLocale: browser locale detection with fallback
 *
 * @module i18n-utils-test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { detectLocale, flattenTranslations, interpolate } from './utils';

// ============================================================================
// interpolate
// ============================================================================

describe('interpolate', () => {
  it('should return the template unchanged when no params are provided', () => {
    expect(interpolate('Hello, world!')).toBe('Hello, world!');
  });

  it('should return the template unchanged when params is undefined', () => {
    expect(interpolate('Hello, world!', undefined)).toBe('Hello, world!');
  });

  it('should replace a single placeholder with a string value', () => {
    expect(interpolate('Hello, {name}!', { name: 'John' })).toBe('Hello, John!');
  });

  it('should replace a single placeholder with a number value', () => {
    expect(interpolate('{count} items remaining', { count: 5 })).toBe('5 items remaining');
  });

  it('should replace multiple placeholders', () => {
    expect(
      interpolate('{greeting}, {name}! You have {count} messages.', {
        greeting: 'Hello',
        name: 'Alice',
        count: 3,
      }),
    ).toBe('Hello, Alice! You have 3 messages.');
  });

  it('should leave unmatched placeholders unchanged', () => {
    expect(interpolate('Hello, {name}! Your role is {role}.', { name: 'Bob' })).toBe(
      'Hello, Bob! Your role is {role}.',
    );
  });

  it('should handle empty params object', () => {
    expect(interpolate('Hello, {name}!', {})).toBe('Hello, {name}!');
  });

  it('should handle template with no placeholders', () => {
    expect(interpolate('No placeholders here.', { name: 'John' })).toBe('No placeholders here.');
  });

  it('should handle empty template string', () => {
    expect(interpolate('', { name: 'John' })).toBe('');
  });

  it('should replace duplicate placeholders', () => {
    expect(interpolate('{name} meets {name}', { name: 'Alice' })).toBe('Alice meets Alice');
  });

  it('should handle zero as a parameter value', () => {
    expect(interpolate('{count} items', { count: 0 })).toBe('0 items');
  });
});

// ============================================================================
// flattenTranslations
// ============================================================================

describe('flattenTranslations', () => {
  it('should return already-flat maps unchanged', () => {
    const flat = {
      'common.save': 'Save',
      'common.cancel': 'Cancel',
    };
    expect(flattenTranslations(flat)).toEqual(flat);
  });

  it('should flatten one level of nesting', () => {
    const nested = {
      common: { save: 'Save', cancel: 'Cancel' },
    };
    expect(flattenTranslations(nested)).toEqual({
      'common.save': 'Save',
      'common.cancel': 'Cancel',
    });
  });

  it('should handle a mix of flat and nested keys', () => {
    const mixed = {
      'auth.login.title': 'Sign In',
      common: { save: 'Save' },
    };
    expect(flattenTranslations(mixed)).toEqual({
      'auth.login.title': 'Sign In',
      'common.save': 'Save',
    });
  });

  it('should handle an empty map', () => {
    expect(flattenTranslations({})).toEqual({});
  });

  it('should handle multiple nested groups', () => {
    const nested = {
      common: { save: 'Save' },
      auth: { login: 'Login', register: 'Register' },
    };
    expect(flattenTranslations(nested)).toEqual({
      'common.save': 'Save',
      'auth.login': 'Login',
      'auth.register': 'Register',
    });
  });
});

// ============================================================================
// detectLocale
// ============================================================================

describe('detectLocale', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('should return en-US for exact match', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'en-US', languages: ['en-US'] },
      writable: true,
      configurable: true,
    });
    expect(detectLocale()).toBe('en-US');
  });

  it('should return es for exact match', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'es', languages: ['es'] },
      writable: true,
      configurable: true,
    });
    expect(detectLocale()).toBe('es');
  });

  it('should match language prefix (es-MX -> es)', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'es-MX', languages: ['es-MX'] },
      writable: true,
      configurable: true,
    });
    expect(detectLocale()).toBe('es');
  });

  it('should match language prefix (en-GB -> en-US)', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'en-GB', languages: ['en-GB'] },
      writable: true,
      configurable: true,
    });
    expect(detectLocale()).toBe('en-US');
  });

  it('should fall back to en-US for unsupported locale', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'ko', languages: ['ko'] },
      writable: true,
      configurable: true,
    });
    expect(detectLocale()).toBe('en-US');
  });

  it('should use the first matching language from navigator.languages', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'ko', languages: ['ko', 'fr', 'en-US'] },
      writable: true,
      configurable: true,
    });
    expect(detectLocale()).toBe('fr');
  });

  it('should fall back to navigator.language when languages is empty', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'fr', languages: [] },
      writable: true,
      configurable: true,
    });
    expect(detectLocale()).toBe('fr');
  });

  it('should return en-US when navigator is undefined', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(detectLocale()).toBe('en-US');
  });
});
