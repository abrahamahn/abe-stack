/**
 * Core authentication types
 */

/**
 * Login options
 */
export interface LoginOptions {
  /** IP address of the client */
  ipAddress?: string;

  /** Device information */
  device?: {
    id?: string;
    name?: string;
    type?: string;
    os?: string;
    browser?: string;
  };

  /** Remember me flag */
  rememberMe?: boolean;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Authentication result
 */
export interface AuthResult {
  /** User information */
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
    [key: string]: any;
  };

  /** Access token for API calls */
  accessToken: string;

  /** Refresh token for obtaining new access tokens */
  refreshToken: string;

  /** When the access token expires (in seconds) */
  expiresIn: number;

  /** Token type (always "Bearer") */
  tokenType: string;

  /** Whether MFA is required */
  mfaRequired?: boolean;

  /** MFA options if required */
  mfaOptions?: {
    type: string;
    id: string;
    [key: string]: any;
  }[];
}
