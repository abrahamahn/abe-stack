// main/shared/src/primitives/constants/regex.ts

/**
 * @file Regex Patterns
 * @description Pure regex constants for validation and parsing.
 * @module Primitives/Constants/Regex
 */

/**
 * Collection of standard regex patterns.
 * All patterns are anchored (start/end) where appropriate for validation safety.
 */
export const REGEX_PATTERNS = {
  /** Standard email validation (HTML5 spec compliant). */
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** Lowercase alphanumeric usernames with underscores (2-30 chars). */
  USERNAME: /^[a-z][a-z0-9_]{1,29}$/,
  /** Alphanumeric usernames allowing uppercase (1-15 chars). */
  USERNAME_LOCAL: /^[a-zA-Z0-9_]{1,15}$/,
  /** Loose phone number validation (allows spaces, dashes, parens). */
  PHONE: /^\+?[0-9\s\-()]{7,20}$/,
  /** Strict E.164 phone number validation. */
  PHONE_E164: /^\+[1-9]\d{1,14}$/,
  /** ISO 8601 full datetime (UTC). */
  DATE_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
  /** YYYY-MM-DD date format. */
  DATE_ONLY: /^\d{4}-\d{2}-\d{2}$/,
  /** Generic URL validation (http/https). */
  URL: /^https?:\/\/.+/,
  /** URL-friendly slug pattern (lowercase-alphanumeric-kebab). */
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  /** UUID v4 pattern. */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  /** Password complexity: 8+ chars, 1 number, 1 special char. */
  PASSWORD_COMPLEXITY: /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/,
  /** Safe filenames (alphanumeric, dot, underscore, dash). */
  SAFE_FILENAME: /^[a-zA-Z0-9._-]+$/,
  /** Safe SQL identifiers (letters, numbers, underscores, max 63 chars). */
  SAFE_SQL_IDENTIFIER: /^[a-zA-Z][a-zA-Z0-9_]{0,62}$/,
  /** Invalid characters for filenames. */
  UNSAFE_FILENAME_CHARS: /[/\\:*?"<>|]/g,
  /** ASCII control characters. */
  CONTROL_CHARS: new RegExp(
    '[' +
      String.fromCharCode(0x00) +
      '-' +
      String.fromCharCode(0x1f) +
      String.fromCharCode(0x7f) +
      '-' +
      String.fromCharCode(0x9f) +
      ']',
    'g',
  ),
  /** IPv4 address pattern. */
  IP_V4: /^(\d{1,3}\.){3}\d{1,3}$/,
  /** IPv6 address pattern. */
  IP_V6: /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/,
} as const;

/** Patterns used strictly for auditing/logging contexts. */
export const AUDIT_PATTERNS = {
  /** Hierarchical action format (e.g. `user.create.success`). */
  ACTION_REGEX: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/,
} as const;

// ----------------------------------------------------------------------------
// Direct Exports
// ----------------------------------------------------------------------------

export const EMAIL_REGEX = REGEX_PATTERNS.EMAIL;
export const USERNAME_REGEX_LOCAL = REGEX_PATTERNS.USERNAME_LOCAL;
export const PHONE_REGEX = REGEX_PATTERNS.PHONE;
export const DATE_ONLY_REGEX = REGEX_PATTERNS.DATE_ONLY;
export const URL_REGEX = REGEX_PATTERNS.URL;
export const UUID_REGEX = REGEX_PATTERNS.UUID;
export const AUDIT_ACTION_REGEX = AUDIT_PATTERNS.ACTION_REGEX;
export const IP_V4_REGEX = REGEX_PATTERNS.IP_V4;
export const IP_V6_REGEX = REGEX_PATTERNS.IP_V6;
