// apps/server/src/infrastructure/security/crypto/jwtRotation.ts
/**
 * JWT Secret Rotation Support
 *
 * Implements dual-secret verification for seamless JWT secret rotation.
 * During rotation periods, tokens signed with either the current or
 * previous secret are accepted, while new tokens are always signed
 * with the current secret.
 *
 * Rotation workflow:
 * 1. Set previousSecret to current secret
 * 2. Generate new current secret
 * 3. Deploy - both secrets now work for verification
 * 4. Wait for token TTL to expire (e.g., 24h for access tokens)
 * 5. Remove previousSecret
 */

import { JwtError, sign as jwtSign, verify as jwtVerify } from '@abe-stack/core/crypto';

import type { JwtPayload, SignOptions as JwtSignOptions } from '@abe-stack/core/crypto';

// ============================================================================
// Types
// ============================================================================

export interface JwtRotationConfig {
  /** Current (primary) secret used for signing and verification */
  secret: string;
  /** Previous secret - used only for verification during rotation */
  previousSecret?: string;
}

export interface RotatingJwtOptions extends JwtSignOptions {
  /** Override config for this operation */
  config?: JwtRotationConfig;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Sign a JWT payload using the current secret
 * Always uses the current (primary) secret, never the previous one
 *
 * @param payload - The data to include in the token
 * @param config - Rotation config with current and optional previous secrets
 * @param options - Standard JWT signing options (expiresIn, etc.)
 * @returns Signed JWT token string
 *
 * @example
 * ```typescript
 * const config = {
 *   secret: process.env.JWT_SECRET,
 *   previousSecret: process.env.JWT_SECRET_PREVIOUS,
 * };
 *
 * const token = signWithRotation(
 *   { userId: '123', role: 'user' },
 *   config,
 *   { expiresIn: '15m' }
 * );
 * ```
 */
export function signWithRotation(
  payload: object,
  config: JwtRotationConfig,
  options?: JwtSignOptions,
): string {
  if (config.secret === '') {
    throw new JwtError('JWT secret is required', 'INVALID_TOKEN');
  }

  return jwtSign(payload, config.secret, options);
}

/**
 * Verify a JWT token using dual-secret strategy
 * First attempts verification with current secret, then falls back to previous secret
 *
 * @param token - The JWT token to verify
 * @param config - Rotation config with current and optional previous secrets
 * @returns Decoded and verified JWT payload
 * @throws JwtError if token is invalid with both secrets
 *
 * @example
 * ```typescript
 * const config = {
 *   secret: process.env.JWT_SECRET,
 *   previousSecret: process.env.JWT_SECRET_PREVIOUS,
 * };
 *
 * try {
 *   const payload = verifyWithRotation(token, config);
 *   console.log('Valid token for user:', payload.userId);
 * } catch (error) {
 *   if (error instanceof JwtError) {
 *     console.log('Invalid token:', error.code);
 *   }
 * }
 * ```
 */
export function verifyWithRotation(token: string, config: JwtRotationConfig): JwtPayload {
  if (config.secret === '') {
    throw new JwtError('JWT secret is required', 'INVALID_TOKEN');
  }

  // Try current secret first
  try {
    return jwtVerify(token, config.secret);
  } catch (currentError) {
    // If we have a previous secret and current failed with signature error,
    // try the previous secret
    if (
      config.previousSecret != null &&
      config.previousSecret !== '' &&
      currentError instanceof JwtError &&
      currentError.code === 'INVALID_SIGNATURE'
    ) {
      try {
        return jwtVerify(token, config.previousSecret);
      } catch {
        // If previous also fails, throw the original error
        // This preserves the error from the current secret attempt
        throw currentError;
      }
    }

    // For non-signature errors (expired, malformed), don't try previous secret
    throw currentError;
  }
}

/**
 * Check if a token was signed with the previous secret
 * Useful for logging and monitoring during rotation
 *
 * @param token - The JWT token to check
 * @param config - Rotation config with current and optional previous secrets
 * @returns Object indicating which secret was used and if token is valid
 */
export function checkTokenSecret(
  token: string,
  config: JwtRotationConfig,
): {
  isValid: boolean;
  usedSecret: 'current' | 'previous' | 'none';
  error?: JwtError;
} {
  if (config.secret === '') {
    return {
      isValid: false,
      usedSecret: 'none',
      error: new JwtError('JWT secret is required', 'INVALID_TOKEN'),
    };
  }

  // Try current secret
  try {
    jwtVerify(token, config.secret);
    return { isValid: true, usedSecret: 'current' };
  } catch (currentError) {
    // Try previous secret if available and signature mismatch
    if (
      config.previousSecret != null &&
      config.previousSecret !== '' &&
      currentError instanceof JwtError &&
      currentError.code === 'INVALID_SIGNATURE'
    ) {
      try {
        jwtVerify(token, config.previousSecret);
        return { isValid: true, usedSecret: 'previous' };
      } catch {
        // Both failed
      }
    }

    return {
      isValid: false,
      usedSecret: 'none',
      error: currentError instanceof JwtError ? currentError : undefined,
    };
  }
}

/**
 * Create a configured JWT rotation handler
 * Provides a convenient interface for applications using rotation
 *
 * @param config - Rotation config with current and optional previous secrets
 * @returns Object with sign and verify functions pre-configured with secrets
 *
 * @example
 * ```typescript
 * const jwt = createJwtRotationHandler({
 *   secret: process.env.JWT_SECRET!,
 *   previousSecret: process.env.JWT_SECRET_PREVIOUS,
 * });
 *
 * // Sign tokens
 * const token = jwt.sign({ userId: '123' }, { expiresIn: '1h' });
 *
 * // Verify tokens (works with current or previous secret)
 * const payload = jwt.verify(token);
 * ```
 */
export interface JwtRotationHandler {
  sign: (payload: object, options?: JwtSignOptions) => string;
  verify: (token: string) => JwtPayload;
  checkSecret: (token: string) => {
    isValid: boolean;
    usedSecret: 'current' | 'previous' | 'none';
    error?: JwtError;
  };
  isRotating: () => boolean;
  getConfig: () => { hasSecret: boolean; hasPreviousSecret: boolean };
}

export function createJwtRotationHandler(config: JwtRotationConfig): JwtRotationHandler {
  return {
    sign: (payload: object, options?: JwtSignOptions): string => {
      return signWithRotation(payload, config, options);
    },

    verify: (token: string): JwtPayload => {
      return verifyWithRotation(token, config);
    },

    checkSecret: (
      token: string,
    ): {
      isValid: boolean;
      usedSecret: 'current' | 'previous' | 'none';
      error?: JwtError;
    } => {
      return checkTokenSecret(token, config);
    },

    /** Check if rotation is currently active (previous secret configured) */
    isRotating: (): boolean => {
      return Boolean(config.previousSecret);
    },

    /** Get the current config (for debugging/logging) */
    getConfig: (): { hasSecret: boolean; hasPreviousSecret: boolean } => ({
      hasSecret: Boolean(config.secret),
      hasPreviousSecret: Boolean(config.previousSecret),
    }),
  };
}
