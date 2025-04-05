export * from "./authHelpers";

export {
  generateSignature,
  verifySignature as verifySignatureWithObject,
  serializeSignature,
  deserializeSignature,
} from "./signatureHelpers";
export type {
  SignatureOptions as ObjectSignatureOptions,
  SecuritySignature,
} from "./signatureHelpers";
export { DEFAULT_SIGNATURE_OPTIONS as DEFAULT_OBJECT_SIGNATURE_OPTIONS } from "./signatureHelpers";

export {
  createSignature,
  verifySignature as verifySignatureWithString,
  generateCsrfToken,
  verifyCsrfToken,
} from "./securityHelpers";
export type {
  SignatureOptions as StringSignatureOptions,
  CsrfOptions,
  CsrfPayload,
} from "./securityHelpers";
export {
  DEFAULT_SIGNATURE_OPTIONS as DEFAULT_STRING_SIGNATURE_OPTIONS,
  DEFAULT_CSRF_OPTIONS,
} from "./securityHelpers";

export { csrfToken, csrfProtection } from "./middleware/csrfMiddleware";
export type { CsrfMiddlewareOptions } from "./middleware/csrfMiddleware";
export { DEFAULT_CSRF_MIDDLEWARE_OPTIONS } from "./middleware/csrfMiddleware";

/**
 * Security utilities for robust application protection
 *
 * This module provides a set of tools for strengthening application security:
 *
 * - Authentication: Password hashing, validation, and cookie management
 * - Signatures: Multiple signature generation and verification approaches
 * - Request Protection: CSRF protection and security header utilities
 *
 * Usage examples are available in the tests.
 */
