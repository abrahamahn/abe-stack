/**
 * Cookie Utilities
 *
 * Core functionality for managing authentication cookies
 * and cookie-based authentication.
 */

import crypto from "crypto";

import { injectable, inject } from "inversify";

import type { IConfigService } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

import type { ServerConfig } from "../config/ConfigService";
import type { Request, Response } from "express";


/**
 * Cookie options interface
 */
export interface CookieOptions {
  /** Whether the cookie is HTTP only (default: true) */
  httpOnly?: boolean;

  /** Whether the cookie is secure (default: depends on environment) */
  secure?: boolean;

  /** Cookie same site policy (default: strict) */
  sameSite?: boolean | "strict" | "lax" | "none";

  /** Cookie path (default: /) */
  path?: string;

  /** Cookie domain */
  domain?: string;

  /** Cookie expiration date */
  expires?: Date;

  /** Cookie max age in milliseconds */
  maxAge?: number;

  /** Whether to sign the cookie */
  signed?: boolean;
}

/**
 * Default cookie options
 */
export const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

/**
 * Cookie service handling auth cookies with proper dependency injection
 */
@injectable()
export class CookieService {
  constructor(
    @inject(TYPES.ConfigService) private configService: IConfigService,
    @inject(TYPES.SecurityLogger) private logger: ILoggerService
  ) {}

  /**
   * Set authentication cookies on the response
   */
  setAuthCookies(
    args: {
      authToken: string;
      expiration: Date;
      userId: string;
    },
    res: Response
  ): void {
    try {
      const { authToken, expiration, userId } = args;
      const config = this.configService.get("server") as ServerConfig;

      const cookieOptions = {
        secure: config.production,
        httpOnly: true,
        expires: expiration,
        sameSite: "strict" as const,
        domain: config.production
          ? typeof config.corsOrigin === "string"
            ? config.corsOrigin
            : undefined
          : undefined,
      };

      // Set the cookie on the response.
      res.cookie("authToken", authToken, cookieOptions);

      // Set the current logged in userId so the client knows.
      res.cookie("userId", userId, {
        ...cookieOptions,
        httpOnly: false,
      });

      this.logger.debug("Auth cookies set", {
        userId,
        expires: expiration.toISOString(),
        secure: cookieOptions.secure,
      });
    } catch (error) {
      this.logger.error("Failed to set auth cookies", { error });
      // Continue without setting cookies - the application layer should handle this
    }
  }

  /**
   * Get the authentication token from cookies
   */
  getAuthTokenCookie(
    req: Request & { cookies: { [key: string]: string | undefined } }
  ): string | undefined {
    try {
      const cookies = req.cookies as { [key: string]: string | undefined };
      const token = cookies["authToken"];

      if (!token) {
        this.logger.debug("No auth token found in cookies");
      }

      return token;
    } catch (error) {
      this.logger.error("Error retrieving auth token from cookies", { error });
      return undefined;
    }
  }

  /**
   * Clear authentication cookies
   */
  clearAuthCookies(res: Response): void {
    try {
      res.clearCookie("authToken");
      res.clearCookie("userId");
      this.logger.debug("Auth cookies cleared");
    } catch (error) {
      this.logger.error("Failed to clear auth cookies", { error });
      // Continue despite error - best effort
    }
  }

  /**
   * Sets a cookie with secure defaults
   *
   * @param res - Express response object
   * @param name - Cookie name
   * @param value - Cookie value
   * @param options - Cookie options (optional)
   */
  setCookie(
    res: Response,
    name: string,
    value: string,
    options: CookieOptions = {}
  ): void {
    try {
      const mergedOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };
      res.cookie(name, value, mergedOptions as Record<string, unknown>);

      this.logger.debug(`Cookie set: ${name}`, {
        secure: mergedOptions.secure,
        httpOnly: mergedOptions.httpOnly,
        sameSite: mergedOptions.sameSite,
      });
    } catch (error) {
      this.logger.error("Error setting cookie", { error, name });
      throw new Error(`Failed to set cookie: ${(error as Error).message}`);
    }
  }

  /**
   * Gets a cookie value from the request
   *
   * @param req - Express request object
   * @param name - Cookie name
   * @returns Cookie value or undefined if not found
   */
  getCookie(req: Request, name: string): string | undefined {
    try {
      return req.cookies?.[name];
    } catch (error) {
      this.logger.error("Error getting cookie", { error, name });
      return undefined;
    }
  }

  /**
   * Clears a cookie
   *
   * @param res - Express response object
   * @param name - Cookie name
   * @param options - Cookie options (optional)
   */
  clearCookie(
    res: Response,
    name: string,
    options: Omit<CookieOptions, "maxAge"> = {}
  ): void {
    try {
      const clearOptions = {
        ...DEFAULT_COOKIE_OPTIONS,
        ...options,
      };

      res.clearCookie(name, clearOptions as Record<string, unknown>);
      this.logger.debug(`Cookie cleared: ${name}`);
    } catch (error) {
      this.logger.error("Error clearing cookie", { error, name });
      throw new Error(`Failed to clear cookie: ${(error as Error).message}`);
    }
  }

  /**
   * Sets a signed cookie
   *
   * @param res - Express response object
   * @param name - Cookie name
   * @param value - Cookie value
   * @param secret - Secret key for signing
   * @param options - Cookie options (optional)
   */
  setSignedCookie(
    res: Response,
    name: string,
    value: string,
    secret: string,
    options: CookieOptions = {}
  ): void {
    try {
      // Sign the value
      const hmac = crypto.createHmac("sha256", secret);
      const signature = hmac.update(value).digest("base64url");
      const signedValue = `${value}.${signature}`;

      // Set the cookie with the signed value
      this.setCookie(res, name, signedValue, options);
    } catch (error) {
      this.logger.error("Error setting signed cookie", { error, name });
      throw new Error(
        `Failed to set signed cookie: ${(error as Error).message}`
      );
    }
  }

  /**
   * Gets and verifies a signed cookie
   *
   * @param req - Express request object
   * @param name - Cookie name
   * @param secret - Secret key for verification
   * @returns Original value if valid, undefined if invalid or not found
   */
  getSignedCookie(
    req: Request,
    name: string,
    secret: string
  ): string | undefined {
    try {
      const signedValue = this.getCookie(req, name);

      if (!signedValue) {
        return undefined;
      }

      const [value, signature] = signedValue.split(".");

      if (!value || !signature) {
        this.logger.warn("Invalid signed cookie format", { name });
        return undefined;
      }

      // Verify the signature
      const hmac = crypto.createHmac("sha256", secret);
      const expectedSignature = hmac.update(value).digest("base64url");

      if (signature === expectedSignature) {
        return value;
      }

      this.logger.warn("Cookie signature verification failed", { name });
      return undefined;
    } catch (error) {
      this.logger.error("Error verifying signed cookie", { error, name });
      return undefined;
    }
  }

  /**
   * Sets an encrypted cookie
   *
   * @param res - Express response object
   * @param name - Cookie name
   * @param value - Value to encrypt and store
   * @param encryptionKey - Key for encryption (must be 32 bytes for AES-256)
   * @param options - Cookie options (optional)
   */
  setEncryptedCookie(
    res: Response,
    name: string,
    value: string,
    encryptionKey: Buffer,
    options: CookieOptions = {}
  ): void {
    try {
      // Validate key length
      if (encryptionKey.length !== 32) {
        throw new Error("Encryption key must be 32 bytes for AES-256-GCM");
      }

      // Generate a random IV
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);

      // Encrypt value
      let encrypted = cipher.update(value, "utf8", "base64");
      encrypted += cipher.final("base64");

      // Get authentication tag
      const authTag = cipher.getAuthTag().toString("base64");

      // Format the cookie value: base64(iv).base64(encrypted).base64(authTag)
      const cookieValue = `${iv.toString("base64")}.${encrypted}.${authTag}`;

      // Set the cookie
      this.setCookie(res, name, cookieValue, options);
    } catch (error) {
      this.logger.error("Error encrypting cookie", { error, name });
      throw new Error(`Failed to encrypt cookie: ${(error as Error).message}`);
    }
  }

  /**
   * Gets and decrypts an encrypted cookie
   *
   * @param req - Express request object
   * @param name - Cookie name
   * @param encryptionKey - Key for decryption (must be 32 bytes for AES-256)
   * @returns Decrypted value or undefined if not found or invalid
   */
  getEncryptedCookie(
    req: Request,
    name: string,
    encryptionKey: Buffer
  ): string | undefined {
    try {
      // Validate key length
      if (encryptionKey.length !== 32) {
        throw new Error("Encryption key must be 32 bytes for AES-256-GCM");
      }

      const cookieValue = this.getCookie(req, name);

      if (!cookieValue) {
        return undefined;
      }

      // Split the cookie value: base64(iv).base64(encrypted).base64(authTag)
      const parts = cookieValue.split(".");

      if (parts.length !== 3) {
        this.logger.warn("Invalid encrypted cookie format", { name });
        return undefined;
      }

      const [ivBase64, encryptedBase64, authTagBase64] = parts;

      // Decode components
      const iv = Buffer.from(ivBase64, "base64");
      const encrypted = encryptedBase64;
      const authTag = Buffer.from(authTagBase64, "base64");

      // Create decipher
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        encryptionKey,
        iv
      );
      decipher.setAuthTag(authTag);

      // Decrypt value
      let decrypted = decipher.update(encrypted, "base64", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      this.logger.error("Error decrypting cookie", { error, name });
      return undefined;
    }
  }
}

// Legacy compatibility function - for backward compatibility
// These will be deprecated in favor of the injectable service
export function setAuthCookies(
  config: ServerConfig,
  args: {
    authToken: string;
    expiration: Date;
    userId: string;
  },
  res: Response
): void {
  const { authToken, expiration, userId } = args;

  const cookieOptions = {
    secure: config.production,
    httpOnly: true,
    expires: expiration,
    sameSite: "strict" as const,
    domain: config.production
      ? typeof config.corsOrigin === "string"
        ? config.corsOrigin
        : undefined
      : undefined,
  };

  // Set the cookie on the response.
  res.cookie("authToken", authToken, cookieOptions);

  // Set the current logged in userId so the client knows.
  res.cookie("userId", userId, {
    ...cookieOptions,
    httpOnly: false,
  });
}

// Legacy compatibility function - for backward compatibility
export function getAuthTokenCookie(
  req: Request & { cookies: { [key: string]: string | undefined } }
): string | undefined {
  const cookies = req.cookies as { [key: string]: string | undefined };
  return cookies["authToken"];
}

// Legacy compatibility function - for backward compatibility
export function clearAuthCookies(res: Response): void {
  res.clearCookie("authToken");
  res.clearCookie("userId");
}

/**
 * Sets a cookie with secure defaults
 *
 * @param res - Express response object
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options (optional)
 */
export function setCookie(
  res: Response,
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const mergedOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };
  res.cookie(name, value, mergedOptions as Record<string, unknown>);
}

/**
 * Gets a cookie value from the request
 *
 * @param req - Express request object
 * @param name - Cookie name
 * @returns Cookie value or undefined if not found
 */
export function getCookie(req: Request, name: string): string | undefined {
  return req.cookies?.[name];
}

/**
 * Clears a cookie
 *
 * @param res - Express response object
 * @param name - Cookie name
 * @param options - Cookie options (optional)
 */
export function clearCookie(
  res: Response,
  name: string,
  options: Omit<CookieOptions, "maxAge"> = {}
): void {
  const clearOptions = {
    ...DEFAULT_COOKIE_OPTIONS,
    ...options,
  };
  res.clearCookie(name, clearOptions as Record<string, unknown>);
}

/**
 * Sets a signed cookie
 *
 * @param res - Express response object
 * @param name - Cookie name
 * @param value - Cookie value
 * @param secret - Secret key for signing
 * @param options - Cookie options (optional)
 */
export function setSignedCookie(
  res: Response,
  name: string,
  value: string,
  secret: string,
  options: CookieOptions = {}
): void {
  // Sign the value
  const hmac = crypto.createHmac("sha256", secret);
  const signature = hmac.update(value).digest("base64url");
  const signedValue = `${value}.${signature}`;

  // Set the cookie with the signed value
  setCookie(res, name, signedValue, options);
}

/**
 * Gets and verifies a signed cookie
 *
 * @param req - Express request object
 * @param name - Cookie name
 * @param secret - Secret key for verification
 * @returns Original value if valid, undefined if invalid or not found
 */
export function getSignedCookie(
  req: Request,
  name: string,
  secret: string
): string | undefined {
  const signedValue = getCookie(req, name);

  if (!signedValue) {
    return undefined;
  }

  const [value, signature] = signedValue.split(".");

  if (!value || !signature) {
    return undefined;
  }

  // Verify the signature
  const hmac = crypto.createHmac("sha256", secret);
  const expectedSignature = hmac.update(value).digest("base64url");

  if (signature === expectedSignature) {
    return value;
  }

  return undefined;
}

/**
 * Sets an encrypted cookie
 *
 * @param res - Express response object
 * @param name - Cookie name
 * @param value - Value to encrypt and store
 * @param encryptionKey - Key for encryption (must be 32 bytes for AES-256)
 * @param options - Cookie options (optional)
 */
export function setEncryptedCookie(
  res: Response,
  name: string,
  value: string,
  encryptionKey: Buffer,
  options: CookieOptions = {}
): void {
  // Validate key length
  if (encryptionKey.length !== 32) {
    throw new Error("Encryption key must be 32 bytes for AES-256-GCM");
  }

  // Generate a random IV
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);

  // Encrypt value
  let encrypted = cipher.update(value, "utf8", "base64");
  encrypted += cipher.final("base64");

  // Get authentication tag
  const authTag = cipher.getAuthTag().toString("base64");

  // Format the cookie value: base64(iv).base64(encrypted).base64(authTag)
  const cookieValue = `${iv.toString("base64")}.${encrypted}.${authTag}`;

  // Set the cookie
  setCookie(res, name, cookieValue, options);
}

/**
 * Gets and decrypts an encrypted cookie
 *
 * @param req - Express request object
 * @param name - Cookie name
 * @param encryptionKey - Key for decryption (must be 32 bytes for AES-256)
 * @returns Decrypted value or undefined if not found or invalid
 */
export function getEncryptedCookie(
  req: Request,
  name: string,
  encryptionKey: Buffer
): string | undefined {
  // Validate key length
  if (encryptionKey.length !== 32) {
    throw new Error("Encryption key must be 32 bytes for AES-256-GCM");
  }

  const cookieValue = getCookie(req, name);

  if (!cookieValue) {
    return undefined;
  }

  // Split the cookie value: base64(iv).base64(encrypted).base64(authTag)
  const parts = cookieValue.split(".");

  if (parts.length !== 3) {
    return undefined;
  }

  try {
    const [ivBase64, encryptedBase64, authTagBase64] = parts;

    // Decode components
    const iv = Buffer.from(ivBase64, "base64");
    const encrypted = encryptedBase64;
    const authTag = Buffer.from(authTagBase64, "base64");

    // Create decipher
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt value
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    return undefined;
  }
}
