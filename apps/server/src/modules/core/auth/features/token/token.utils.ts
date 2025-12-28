/**
 * Token Utilities
 *
 * Provides token verification utilities for authentication.
 */

import jwt from "jsonwebtoken";

import { ServerEnvironment } from "@/server/infrastructure/config/ConfigService";

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  valid: boolean;
  error?: string;
  payload?: {
    userId: string;
    roles?: string[];
    [key: string]: any;
  };
}

/**
 * Verify an access token
 *
 * @param env Server environment
 * @param token JWT token to verify
 * @returns Token verification result
 */
export async function verifyAccessToken(
  env: ServerEnvironment,
  token?: string
): Promise<TokenVerificationResult> {
  if (!token) {
    return {
      valid: false,
      error: "No token provided",
    };
  }

  try {
    // Get the signature secret from configuration
    const secret = env.config.signatureSecret;

    // Verify the token
    const payload = jwt.verify(token, secret);

    // Check if it's an access token
    if (typeof payload === "object" && payload !== null) {
      if (payload.purpose !== "access" && !payload.aud) {
        return {
          valid: false,
          error: "Not an access token",
        };
      }

      return {
        valid: true,
        payload: payload as any,
      };
    }

    return {
      valid: false,
      error: "Invalid token payload",
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: "Token expired",
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: "Invalid token",
      };
    }

    return {
      valid: false,
      error: "Token verification error",
    };
  }
}
