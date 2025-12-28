/**
 * CSRF Protection Utilities
 *
 * Core functionality for protecting against Cross-Site Request Forgery attacks.
 */

import { createHmac, timingSafeEqual, randomBytes } from "crypto";

import { serialize, Data } from "./encryptionUtils";

/**
 * CSRF token options
 */
export interface CSRFOptions {
  /** Token expiration in milliseconds (default: 1 hour) */
  expiryMs?: number;

  /** Whether to include the user agent in the token validation */
  includeUserAgent?: boolean;

  /** Whether to include the origin/referer in the token validation */
  includeOrigin?: boolean;

  /** Secret key for token signing */
  secret?: string;

  /** Name of the cookie to store the token */
  cookieName?: string;

  /** Name of the header where token is expected */
  headerName?: string;

  /** Enforce HTTPOnly flag for cookies */
  httpOnly?: boolean;

  /** Set token cookie to secure (HTTPS only) */
  secure?: boolean;

  /** Set token cookie same-site attribute */
  sameSite?: "strict" | "lax" | "none";
}

/**
 * Default CSRF options
 */
export const DEFAULT_CSRF_OPTIONS: CSRFOptions = {
  expiryMs: 3600000, // 1 hour
  includeUserAgent: true,
  includeOrigin: true,
  cookieName: "csrf-token",
  headerName: "X-CSRF-Token",
  httpOnly: true,
  secure: true,
  sameSite: "strict",
};

/**
 * CSRF token payload structure
 */
export interface CsrfPayload {
  /** Session ID the token is bound to */
  sessionId: string;

  /** Timestamp when token was created */
  timestamp: number;

  /** Browser user agent (if enabled) */
  userAgent?: string;

  /** Origin or referrer URL (if enabled) */
  origin?: string;

  /** Random nonce to prevent token reuse */
  nonce: string;
}

/**
 * Generate a CSRF token for protecting against CSRF attacks
 *
 * @param sessionId - The user's session ID to bind the token to
 * @param secretKey - Secret key used for signing
 * @param options - CSRF token generation options
 * @param context - Additional context like user agent and origin
 * @returns A CSRF token string that can be included in forms
 */
export function generateCsrfToken(
  sessionId: string,
  secretKey: Buffer,
  options: CSRFOptions = DEFAULT_CSRF_OPTIONS,
  context?: { userAgent?: string; origin?: string }
): string {
  // Ensure we have a session ID
  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("Invalid session ID provided for CSRF token generation");
  }

  // Create the token payload
  const payload: CsrfPayload = {
    sessionId,
    timestamp: Date.now(),
    nonce: randomBytes(16).toString("hex"),
  };

  // Include user agent if requested and available
  if (options.includeUserAgent && context?.userAgent) {
    payload.userAgent = context.userAgent;
  }

  // Include origin if requested and available
  if (options.includeOrigin && context?.origin) {
    payload.origin = context.origin;
  }

  // Create the serialized payload - convert to Data type by treating as unknown first
  const serializedPayload = serialize(payload as unknown as Data);

  // Create a signature for the payload
  const hmac = createHmac("sha256", secretKey);
  hmac.update(serializedPayload);
  const signature = hmac.digest("base64");

  // Combine payload and signature to create the token
  const token = Buffer.from(
    JSON.stringify({
      payload,
      signature,
    })
  ).toString("base64");

  return token;
}

/**
 * Verify a CSRF token
 *
 * @param token - The CSRF token to verify
 * @param sessionId - The current user session ID
 * @param secretKey - Secret key used for signing
 * @param options - CSRF token verification options
 * @param context - Additional context like user agent and origin
 * @returns Boolean indicating whether the token is valid
 */
export function verifyCsrfToken(
  token: string,
  sessionId: string,
  secretKey: Buffer,
  options: CSRFOptions = DEFAULT_CSRF_OPTIONS,
  context?: { userAgent?: string; origin?: string }
): boolean {
  if (!token || typeof token !== "string" || !sessionId) {
    return false;
  }

  try {
    // First try to decode from base64
    let decodedToken;
    try {
      decodedToken = Buffer.from(token, "base64").toString("utf-8");
    } catch (error) {
      return false;
    }

    // Then try to parse as JSON
    let parsed;
    try {
      parsed = JSON.parse(decodedToken);
    } catch (error) {
      return false;
    }

    const { payload, signature } = parsed;

    // Validate the token content
    if (
      !payload ||
      !signature ||
      !payload.sessionId ||
      !payload.timestamp ||
      !payload.nonce
    ) {
      return false;
    }

    // Verify token is for the correct session
    if (payload.sessionId !== sessionId) {
      return false;
    }

    // Check if token has expired
    const now = Date.now();
    const expiryMs = options.expiryMs || DEFAULT_CSRF_OPTIONS.expiryMs;
    if (now - payload.timestamp > expiryMs!) {
      return false;
    }

    // Verify user agent if required
    if (options.includeUserAgent && payload.userAgent && context?.userAgent) {
      if (payload.userAgent !== context.userAgent) {
        return false;
      }
    }

    // Verify origin if required
    if (options.includeOrigin && payload.origin && context?.origin) {
      if (payload.origin !== context.origin) {
        return false;
      }
    }

    // Recreate signature and verify
    const serializedPayload = serialize(payload as unknown as Data);
    const hmac = createHmac("sha256", secretKey);
    hmac.update(serializedPayload);
    const expectedSignature = hmac.digest("base64");

    // Compare signatures using timing-safe comparison
    try {
      return timingSafeEqual(
        Buffer.from(signature, "utf-8"),
        Buffer.from(expectedSignature, "utf-8")
      );
    } catch (error) {
      // Handle cases where inputs to timingSafeEqual are invalid
      return false;
    }
  } catch (error) {
    // Silently return false for any other error
    return false;
  }
}

/**
 * Create middleware configuration for CSRF protection
 */
export function createCSRFMiddleware(
  options?: CSRFOptions
): Record<string, any> {
  const mergedOptions = { ...DEFAULT_CSRF_OPTIONS, ...options };

  return {
    cookieName: mergedOptions.cookieName,
    headerName: mergedOptions.headerName,
    expiryMinutes: Math.floor((mergedOptions.expiryMs || 3600000) / 60000),
    includeUserAgent: mergedOptions.includeUserAgent,
    includeOrigin: mergedOptions.includeOrigin,
    httpOnly: mergedOptions.httpOnly,
    secure: mergedOptions.secure,
    sameSite: mergedOptions.sameSite,
  };
}

/**
 * Create a CSRF token pair (token and hash)
 *
 * @param secret - Secret key for token signing
 * @returns An object containing token and hash
 */
export function createCSRFTokenPair(secret?: string): {
  token: string;
  hash: string;
} {
  const secretBuffer = Buffer.from(secret || "default-csrf-secret");

  // Generate a random session ID for demonstration purposes
  // In real applications, this would be the actual user session ID
  const sessionId = randomBytes(16).toString("hex");

  // Generate a token with minimal context
  const token = generateCsrfToken(
    sessionId,
    secretBuffer,
    DEFAULT_CSRF_OPTIONS,
    { userAgent: "userAgent", origin: "origin" }
  );

  // Create a hash using HMAC for better security
  const hmac = createHmac("sha256", secretBuffer);
  hmac.update(token);
  const hash = hmac.digest("base64");

  return { token, hash };
}

/**
 * Verify that a token and hash pair are valid
 *
 * @param token - The CSRF token
 * @param hash - The hash associated with the token
 * @param secret - Secret key used for signing
 * @returns Boolean indicating whether the pair is valid
 */
export function verifyCSRFTokenPair(
  token: string,
  hash: string,
  secret?: string
): boolean {
  if (!token || !hash) {
    return false;
  }

  const secretBuffer = Buffer.from(secret || "default-csrf-secret");

  // Create a hash of the token using the same method
  const hmac = createHmac("sha256", secretBuffer);
  hmac.update(token);
  const expectedHash = hmac.digest("base64");

  // Compare using timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(hash, "utf-8"),
      Buffer.from(expectedHash, "utf-8")
    );
  } catch (error) {
    return false;
  }
}
