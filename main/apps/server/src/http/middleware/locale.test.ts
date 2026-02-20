// main/apps/server/src/http/middleware/locale.test.ts
/**
 * Accept-Language Middleware Tests
 *
 * Tests for header parsing, locale resolution, quality-value sorting,
 * and Fastify hook integration.
 */

import fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  DEFAULT_LOCALE,
  parseAcceptLanguage,
  registerLocaleHook,
  resolveLocale,
  SUPPORTED_LOCALES,
} from './locale';

import type { FastifyInstance } from 'fastify';

// ============================================================================
// parseAcceptLanguage
// ============================================================================

describe('parseAcceptLanguage', () => {
  test('should return empty array for empty string', () => {
    expect(parseAcceptLanguage('')).toEqual([]);
  });

  test('should return empty array for wildcard', () => {
    expect(parseAcceptLanguage('*')).toEqual([]);
  });

  test('should parse a single locale', () => {
    const result = parseAcceptLanguage('en-US');
    expect(result).toEqual([{ locale: 'en-US', quality: 1 }]);
  });

  test('should parse multiple locales with quality values', () => {
    const result = parseAcceptLanguage('en-US,en;q=0.9,fr;q=0.8');
    expect(result).toEqual([
      { locale: 'en-US', quality: 1 },
      { locale: 'en', quality: 0.9 },
      { locale: 'fr', quality: 0.8 },
    ]);
  });

  test('should sort by quality descending', () => {
    const result = parseAcceptLanguage('fr;q=0.5,en-US;q=0.9,es;q=0.7');
    expect(result[0]!.locale).toBe('en-US');
    expect(result[1]!.locale).toBe('es');
    expect(result[2]!.locale).toBe('fr');
  });

  test('should default quality to 1 when not specified', () => {
    const result = parseAcceptLanguage('de,fr;q=0.5');
    expect(result[0]).toEqual({ locale: 'de', quality: 1 });
    expect(result[1]).toEqual({ locale: 'fr', quality: 0.5 });
  });

  test('should handle whitespace around entries', () => {
    const result = parseAcceptLanguage(' en-US , fr ; q=0.8 ');
    expect(result).toHaveLength(2);
    expect(result[0]!.locale).toBe('en-US');
    expect(result[1]!.locale).toBe('fr');
  });

  test('should skip wildcard entries within a list', () => {
    const result = parseAcceptLanguage('en-US,*,fr;q=0.5');
    expect(result).toHaveLength(2);
    expect(result[0]!.locale).toBe('en-US');
    expect(result[1]!.locale).toBe('fr');
  });

  test('should skip empty entries from trailing commas', () => {
    const result = parseAcceptLanguage('en-US,,fr;q=0.5,');
    expect(result).toHaveLength(2);
  });

  test('should handle complex real-world Accept-Language headers', () => {
    const header = 'en-US,en;q=0.9,es-MX;q=0.8,es;q=0.7,fr;q=0.6';
    const result = parseAcceptLanguage(header);
    expect(result).toHaveLength(5);
    expect(result[0]!.locale).toBe('en-US');
    expect(result[4]!.locale).toBe('fr');
  });

  test('should ignore invalid quality values', () => {
    const result = parseAcceptLanguage('en;q=abc');
    expect(result).toEqual([{ locale: 'en', quality: 1 }]);
  });

  test('should ignore out-of-range quality values', () => {
    const result = parseAcceptLanguage('en;q=1.5');
    expect(result).toEqual([{ locale: 'en', quality: 1 }]);
  });
});

// ============================================================================
// resolveLocale
// ============================================================================

describe('resolveLocale', () => {
  test('should return DEFAULT_LOCALE for empty entries', () => {
    expect(resolveLocale([])).toBe(DEFAULT_LOCALE);
  });

  test('should return exact match for supported locale', () => {
    const entries = [{ locale: 'es', quality: 1 }];
    expect(resolveLocale(entries)).toBe('es');
  });

  test('should return exact match for en-US', () => {
    const entries = [{ locale: 'en-US', quality: 1 }];
    expect(resolveLocale(entries)).toBe('en-US');
  });

  test('should return prefix match for language subtag', () => {
    const entries = [{ locale: 'es-MX', quality: 1 }];
    expect(resolveLocale(entries)).toBe('es');
  });

  test('should return en-US for prefix "en"', () => {
    const entries = [{ locale: 'en', quality: 1 }];
    expect(resolveLocale(entries)).toBe('en-US');
  });

  test('should return fr for prefix "fr"', () => {
    const entries = [{ locale: 'fr-FR', quality: 1 }];
    expect(resolveLocale(entries)).toBe('fr');
  });

  test('should return zh-CN for prefix "zh"', () => {
    const entries = [{ locale: 'zh', quality: 1 }];
    expect(resolveLocale(entries)).toBe('zh-CN');
  });

  test('should return DEFAULT_LOCALE for unsupported locale', () => {
    const entries = [{ locale: 'ko', quality: 1 }];
    expect(resolveLocale(entries)).toBe(DEFAULT_LOCALE);
  });

  test('should skip unsupported and match next supported', () => {
    const entries = [
      { locale: 'ko', quality: 1 },
      { locale: 'fr', quality: 0.8 },
    ];
    expect(resolveLocale(entries)).toBe('fr');
  });

  test('should respect quality ordering', () => {
    const entries = [
      { locale: 'fr', quality: 0.9 },
      { locale: 'es', quality: 1 },
    ];
    // Already sorted by quality in parseAcceptLanguage, so the first match wins
    expect(resolveLocale(entries)).toBe('fr');
  });
});

// ============================================================================
// Constants
// ============================================================================

describe('constants', () => {
  test('DEFAULT_LOCALE should be en-US', () => {
    expect(DEFAULT_LOCALE).toBe('en-US');
  });

  test('SUPPORTED_LOCALES should include en-US, es, fr', () => {
    expect(SUPPORTED_LOCALES).toContain('en-US');
    expect(SUPPORTED_LOCALES).toContain('es');
    expect(SUPPORTED_LOCALES).toContain('fr');
  });

  test('SUPPORTED_LOCALES should include all 6 locales', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(6);
  });
});

// ============================================================================
// registerLocaleHook — Fastify integration
// ============================================================================

describe('registerLocaleHook', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = fastify();
    registerLocaleHook(server);

    server.get('/test', (request) => {
      return { locale: request.locale };
    });

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should default to en-US when no Accept-Language header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { locale: string };
    expect(body.locale).toBe('en-US');
  });

  test('should resolve es from Accept-Language: es', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
      headers: { 'accept-language': 'es' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { locale: string };
    expect(body.locale).toBe('es');
  });

  test('should resolve fr from Accept-Language: fr-FR', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
      headers: { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { locale: string };
    expect(body.locale).toBe('fr');
  });

  test('should resolve en-US from Accept-Language: en-US,en;q=0.9', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
      headers: { 'accept-language': 'en-US,en;q=0.9' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { locale: string };
    expect(body.locale).toBe('en-US');
  });

  test('should fallback to en-US for unsupported locale', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
      headers: { 'accept-language': 'ko-KR' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { locale: string };
    expect(body.locale).toBe('en-US');
  });

  test('should resolve to best match from complex header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
      headers: { 'accept-language': 'ko-KR,ko;q=0.9,ja;q=0.8,en-US;q=0.7' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { locale: string };
    expect(body.locale).toBe('ja');
  });

  test('should handle wildcard Accept-Language gracefully', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/test',
      headers: { 'accept-language': '*' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { locale: string };
    expect(body.locale).toBe('en-US');
  });

  test('should be available on every request', async () => {
    for (const lang of ['es', 'fr', 'de']) {
      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: { 'accept-language': lang },
      });

      const body = JSON.parse(response.body) as { locale: string };
      expect(body.locale).toBe(lang);
    }
  });
});
