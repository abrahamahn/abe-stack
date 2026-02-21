// main/apps/server/src/http/middleware/proxyValidation.ts
/**
 * Thin compatibility shim.
 *
 * Canonical proxy validation utilities now live in `@bslt/shared`.
 * Keep this module so existing app-local import paths remain stable.
 */

export {
  getValidatedClientIp,
  ipMatchesCidr,
  isFromTrustedProxy,
  isValidIp,
  isValidIpv4,
  isValidIpv6,
  parseCidr,
  parseXForwardedFor,
  validateCidrList,
  type ForwardedInfo,
  type ProxyValidationConfig,
} from '@bslt/shared';
