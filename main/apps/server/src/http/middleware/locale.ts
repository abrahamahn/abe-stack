// main/apps/server/src/http/middleware/locale.ts
/**
 * Accept-Language Middleware
 *
 * Parses the `Accept-Language` HTTP header and resolves a supported locale
 * for each incoming request. The resolved locale is attached to
 * `request.locale` so that route handlers can use it for localised
 * error messages and response content.
 *
 * Supported locales: en-US (default), es, fr, de, ja, zh-CN
 *
 * Resolution strategy (in priority order):
 * 1. Exact match against supported locales
 * 2. Language-prefix match (e.g. `es-MX` -> `es`)
 * 3. Fallback to `en-US`
 *
 * @module middleware/locale
 */

import type { FastifyInstance } from 'fastify';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported locale identifiers.
 * Mirrors the client-side Locale type from `@bslt/web/i18n`.
 */
export type SupportedLocale = 'en-US' | 'es' | 'fr' | 'de' | 'ja' | 'zh-CN';

/**
 * A parsed entry from the Accept-Language header.
 */
interface AcceptLanguageEntry {
  /** BCP 47 language tag (e.g. "en-US", "fr") */
  locale: string;
  /** Quality value between 0 and 1 (default 1) */
  quality: number;
}

// ============================================================================
// Constants
// ============================================================================

/** All supported locales for runtime matching. */
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  'en-US',
  'es',
  'fr',
  'de',
  'ja',
  'zh-CN',
];

/** Default locale when no preference is detected or matched. */
export const DEFAULT_LOCALE: SupportedLocale = 'en-US';

// ============================================================================
// Fastify Declaration Merging
// ============================================================================

declare module 'fastify' {
  interface FastifyRequest {
    /** Resolved locale from the Accept-Language header */
    locale: SupportedLocale;
  }
}

// ============================================================================
// Parser
// ============================================================================

/**
 * Parse an `Accept-Language` header value into an ordered list of entries.
 *
 * Handles standard formats:
 * - `en-US,en;q=0.9,fr;q=0.8`
 * - `*`
 * - `de`
 *
 * Entries are returned sorted by quality (descending). Invalid entries
 * and wildcard (`*`) are silently skipped.
 *
 * @param header - Raw `Accept-Language` header value
 * @returns Parsed entries sorted by quality descending
 *
 * @complexity O(n log n) where n is the number of language tags
 */
export function parseAcceptLanguage(header: string): AcceptLanguageEntry[] {
  if (header === '' || header === '*') {
    return [];
  }

  const entries: AcceptLanguageEntry[] = [];

  const parts = header.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === '' || trimmed === '*') {
      continue;
    }

    const segments = trimmed.split(';');
    const locale = segments[0]?.trim() ?? '';

    if (locale === '') {
      continue;
    }

    let quality = 1;
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i]?.trim() ?? '';
      if (segment.startsWith('q=')) {
        const parsed = parseFloat(segment.slice(2));
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          quality = parsed;
        }
      }
    }

    entries.push({ locale, quality });
  }

  // Sort by quality descending (stable sort preserves insertion order for equal q)
  entries.sort((a, b) => b.quality - a.quality);

  return entries;
}

// ============================================================================
// Locale Resolution
// ============================================================================

/**
 * Resolve a supported locale from a list of Accept-Language entries.
 *
 * Matching strategy per entry (in priority order):
 * 1. Exact match (e.g. `en-US` -> `en-US`)
 * 2. Language prefix match (e.g. `es-MX` -> `es`, `en` -> `en-US`)
 *
 * @param entries - Parsed Accept-Language entries, sorted by preference
 * @returns The best matching supported locale, or `DEFAULT_LOCALE`
 *
 * @complexity O(n * m) where n is entries length and m is SUPPORTED_LOCALES length
 */
export function resolveLocale(entries: AcceptLanguageEntry[]): SupportedLocale {
  for (const entry of entries) {
    // 1. Exact match
    const exactMatch = SUPPORTED_LOCALES.find((s) => s === entry.locale);
    if (exactMatch !== undefined) {
      return exactMatch;
    }

    // 2. Language prefix match
    const prefix = entry.locale.split('-')[0] ?? '';
    if (prefix !== '') {
      const prefixMatch = SUPPORTED_LOCALES.find(
        (s) => s === prefix || s.startsWith(`${prefix}-`),
      );
      if (prefixMatch !== undefined) {
        return prefixMatch;
      }
    }
  }

  return DEFAULT_LOCALE;
}

// ============================================================================
// Middleware Registration
// ============================================================================

/**
 * Register the locale resolution hook on the Fastify instance.
 *
 * Adds an `onRequest` hook that:
 * 1. Reads the `Accept-Language` header
 * 2. Parses and quality-sorts the language preferences
 * 3. Resolves against the list of supported locales
 * 4. Attaches the result to `request.locale`
 *
 * Handlers can then access `request.locale` to localise error messages
 * or response content.
 *
 * @param app - The Fastify instance to register on
 *
 * @example
 * ```typescript
 * // In server setup:
 * registerLocaleHook(server);
 *
 * // In route handlers:
 * server.get('/example', (request, reply) => {
 *   const locale = request.locale; // e.g. 'es'
 *   reply.send({ message: getLocalisedMessage(locale) });
 * });
 * ```
 */
export function registerLocaleHook(app: FastifyInstance): void {
  app.addHook('onRequest', (req, _reply, done) => {
    const acceptLanguage = req.headers['accept-language'] ?? '';
    const entries = parseAcceptLanguage(acceptLanguage);
    req.locale = resolveLocale(entries);
    done();
  });
}
