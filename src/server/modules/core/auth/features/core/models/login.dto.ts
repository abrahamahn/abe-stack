/**
 * Login request data transfer object
 */
export interface LoginRequestDto {
  /**
   * Username or email
   */
  username: string;

  /**
   * User password
   */
  password: string;

  /**
   * MFA code if required
   */
  mfaCode?: string;

  /**
   * Device ID for tracking device-specific tokens
   */
  deviceId?: string;
}

/**
 * Login response data transfer object
 */
export interface LoginResponseDto {
  /**
   * JWT access token
   */
  token: string;

  /**
   * JWT refresh token
   */
  refreshToken: string;

  /**
   * Basic user information
   */
  user: {
    /**
     * User ID
     */
    id: string;

    /**
     * Username
     */
    username: string;

    /**
     * User email
     */
    email: string;

    /**
     * User display name (optional)
     */
    displayName?: string;
  };

  /**
   * Whether MFA verification is required
   */
  mfaRequired?: boolean;

  /**
   * Error message if login failed
   */
  error?: string;
}
