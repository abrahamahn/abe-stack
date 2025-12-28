/**
 * Security Helpers
 *
 * General security utilities and helper functions for
 * common security operations across the application.
 */

import crypto from "crypto";
import { URL } from "url";

/**
 * Sanitize a string to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate a secure random string
 */
export function generateSecureRandomString(length: number = 32): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

/**
 * Generate a nonce for use in CSP
 */
export function generateNonce(): string {
  return generateSecureRandomString(16);
}

/**
 * Create a secure HTTP response headers object
 */
export function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

/**
 * Validate a URL is safe and from an allowed domain
 */
export function validateSafeUrl(
  url: string,
  allowedDomains: string[] = []
): boolean {
  try {
    const parsedUrl = new URL(url);

    // Check if protocol is http or https
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return false;
    }

    // Check if domain is allowed
    if (allowedDomains.length > 0) {
      return allowedDomains.some(
        (domain) =>
          parsedUrl.hostname === domain ||
          parsedUrl.hostname.endsWith(`.${domain}`)
      );
    }

    return true;
  } catch (e) {
    // Invalid URL
    return false;
  }
}

/**
 * Serialize data for consistent signature generation
 * @param data - Data to serialize (string or object)
 * @returns Serialized string representation
 */
export function serialize(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    // Sort keys recursively for consistent serialization regardless of key order
    return JSON.stringify(data, function (_key, value) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        // For object values, create a new sorted object
        return Object.keys(value)
          .sort()
          .reduce<Record<string, unknown>>((sorted, key) => {
            sorted[key] = value[key as keyof typeof value];
            return sorted;
          }, {});
      }
      return value;
    });
  }

  return String(data);
}

/**
 * Create a signature for data using HMAC
 * @param options - Data and secret key for signing
 * @returns Base64 encoded signature
 */
export function createSignature(options: {
  data: unknown;
  secretKey: Buffer;
  algorithm?: string;
}): string {
  const { data, secretKey, algorithm = "sha256" } = options;

  // Serialize data for consistent signature generation
  const serializedData = serialize(data);

  // Create HMAC signature
  const hmac = crypto.createHmac(algorithm, secretKey);
  hmac.update(serializedData);

  // Return base64 encoded signature
  return hmac.digest("base64");
}

/**
 * Verify a signature for data
 * @param options - Data, signature, and secret key for verification
 * @returns Boolean indicating if signature is valid
 */
export function verifySignature(options: {
  data: unknown;
  signature: string;
  secretKey: Buffer;
  algorithm?: string;
}): boolean {
  const { data, signature, secretKey, algorithm = "sha256" } = options;

  try {
    // Generate a new signature for comparison
    const expectedSignature = createSignature({
      data,
      secretKey,
      algorithm,
    });

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, "base64"),
      Buffer.from(expectedSignature, "base64")
    );
  } catch (error) {
    // If any error occurs (invalid base64, etc.), signature is invalid
    return false;
  }
}

/**
 * Create a rate limiter configuration
 */
export function createRateLimiter(
  windowMs: number = 15 * 60 * 1000,
  max: number = 100
): Record<string, any> {
  return {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  };
}

/**
 * Create a Content Security Policy (CSP) configuration
 *
 * @param options - CSP configuration options
 * @returns CSP policy string
 */
export function createCSP(
  options: {
    defaultSrc?: string[];
    scriptSrc?: string[];
    styleSrc?: string[];
    imgSrc?: string[];
    connectSrc?: string[];
    fontSrc?: string[];
    objectSrc?: string[];
    mediaSrc?: string[];
    frameSrc?: string[];
    sandbox?: boolean;
    reportUri?: string;
  } = {}
): string {
  const directives: string[] = [];

  // Set default-src if provided or use 'self'
  directives.push(`default-src ${options.defaultSrc?.join(" ") || "'self'"}`);

  // Add other directives if specified
  if (options.scriptSrc)
    directives.push(`script-src ${options.scriptSrc.join(" ")}`);
  if (options.styleSrc)
    directives.push(`style-src ${options.styleSrc.join(" ")}`);
  if (options.imgSrc) directives.push(`img-src ${options.imgSrc.join(" ")}`);
  if (options.connectSrc)
    directives.push(`connect-src ${options.connectSrc.join(" ")}`);
  if (options.fontSrc) directives.push(`font-src ${options.fontSrc.join(" ")}`);
  if (options.objectSrc)
    directives.push(`object-src ${options.objectSrc.join(" ")}`);
  if (options.mediaSrc)
    directives.push(`media-src ${options.mediaSrc.join(" ")}`);
  if (options.frameSrc)
    directives.push(`frame-src ${options.frameSrc.join(" ")}`);

  // Add sandbox if enabled
  if (options.sandbox) directives.push("sandbox");

  // Add report-uri if specified
  if (options.reportUri) directives.push(`report-uri ${options.reportUri}`);

  return directives.join("; ");
}

/**
 * Clean and sanitize user input for safe database operations
 *
 * @param input - User input to sanitize
 * @returns Sanitized input safe for database operations
 */
export function sanitizeForDatabase(input: string): string {
  // Remove any SQL injection patterns
  return input
    .replace(/['";\\]/g, "") // Remove SQL special characters
    .replace(/--/g, "") // Remove SQL comments
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .replace(/union\s+select/gi, "") // Remove UNION SELECT
    .replace(/select\s+.*\s+from/gi, "") // Remove SELECT FROM
    .replace(/insert\s+into/gi, "") // Remove INSERT INTO
    .replace(/drop\s+table/gi, "") // Remove DROP TABLE
    .replace(/alter\s+table/gi, "") // Remove ALTER TABLE
    .trim();
}

/**
 * CSRF options interface
 */
export interface CsrfOptions {
  expiryMs?: number;
  includeUserAgent?: boolean;
  includeOrigin?: boolean;
  cookieName?: string;
  headerName?: string;
  fieldName?: string;
  protectedMethods?: string[];
  ignorePaths?: (string | RegExp)[];
  secretKey: Buffer;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
  };
}

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(options: {
  secretKey: Buffer;
  expiryMs?: number;
  includeUserAgent?: boolean;
  includeOrigin?: boolean;
}): string {
  const { secretKey, expiryMs = 3600000, includeUserAgent = false, includeOrigin = false } = options;

  const timestamp = Date.now();
  const expiry = timestamp + expiryMs;
  const random = crypto.randomBytes(16).toString('hex');

  const payload = {
    timestamp,
    expiry,
    random,
    ...(includeUserAgent && { userAgent: true }),
    ...(includeOrigin && { origin: true })
  };

  const signature = createSignature({
    data: payload,
    secretKey
  });

  return Buffer.from(JSON.stringify({ ...payload, signature })).toString('base64');
}

/**
 * Verify a CSRF token
 */
export function verifyCsrfToken(options: {
  token: string;
  secretKey: Buffer;
  includeUserAgent?: boolean;
  includeOrigin?: boolean;
}): boolean {
  const { token, secretKey } = options;

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { signature, ...payload } = decoded;

    // Check expiry
    if (Date.now() > payload.expiry) {
      return false;
    }

    // Verify signature
    const expectedSignature = createSignature({
      data: payload,
      secretKey
    });

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );
  } catch (error) {
    return false;
  }
}
