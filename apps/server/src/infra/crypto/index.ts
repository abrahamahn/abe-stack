// apps/server/src/infra/crypto/index.ts
/**
 * Cryptographic Infrastructure
 *
 * Re-exports from @abe-stack/core/crypto with server-specific naming.
 */

export {
  sign as jwtSign,
  verify as jwtVerify,
  decode as jwtDecode,
  JwtError,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type SignOptions as JwtSignOptions,
} from '@abe-stack/core/crypto';
