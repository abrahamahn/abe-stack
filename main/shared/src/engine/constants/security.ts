// main/shared/src/engine/constants/security.ts
/**
 * @file Security Policy Constants
 * @description Constants defining security policies like sensitive keys and redaction rules.
 * @module Engine/Constants/Security
 */

/**
 * Keys that should be redacted from logs and error reports.
 */
export const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'creditCard',
  'cvv',
  'cardDetails',
  'apiKey',
  'clientSecret',
  'privateKey',
] as const;
