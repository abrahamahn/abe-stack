// main/server/system/src/security/crypto/jwt.ts
// Re-export canonical JWT implementation from @bslt/shared.

import { checkTokenSecret, decode, JwtError, sign, verify } from '@bslt/shared/system/crypto';

import type {
  JwtErrorCode,
  JwtHeader,
  JwtPayload,
  SignOptions,
  VerifyOptions,
} from '@bslt/shared/system/crypto';

export { checkTokenSecret, decode, JwtError, sign, verify };
export type { JwtErrorCode, JwtHeader, JwtPayload, SignOptions, VerifyOptions };
