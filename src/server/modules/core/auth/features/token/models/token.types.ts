/**
 * Token types definitions
 */

/**
 * Token payload structure
 */
export interface TokenPayload {
  userId: string;
  roles?: string[];
  email?: string;
  purpose?: string;
  jti?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  [key: string]: any;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

/**
 * Token generation options
 */
export interface TokenGenerationOptions {
  expiresIn?: string | number;
  audience?: string | string[];
  issuer?: string;
  notBefore?: string | number;
  algorithm?: string;
  purpose?: string;
  sessionId?: string;
  [key: string]: any;
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Token configuration
 */
export interface TokenConfig {
  accessTokenExpiry: string | number;
  refreshTokenExpiry: string | number;
  issuer: string;
  audience: string | string[];
  algorithm: string;
  secret: string;
  refreshSecret: string;
}

/**
 * Token service interface
 */
export interface ITokenService {
  generateAccessToken(
    payload: Omit<TokenPayload, "purpose">,
    options?: Partial<TokenGenerationOptions>
  ): Promise<string>;

  generateRefreshToken(
    payload: Omit<TokenPayload, "purpose">,
    options?: Partial<TokenGenerationOptions>
  ): Promise<string>;

  verifyToken(
    token: string,
    options?: { ignoreExpiration?: boolean }
  ): Promise<TokenValidationResult>;

  refreshTokens(refreshToken: string): Promise<TokenRefreshResult | null>;

  revokeToken(token: string, ipAddress?: string): Promise<boolean>;

  revokeAllUserTokens(userId: string, ipAddress?: string): Promise<number>;
}
